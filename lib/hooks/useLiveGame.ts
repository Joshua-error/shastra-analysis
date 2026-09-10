'use client';

import { useCallback, useReducer, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  GameWithPlayers,
  PlayerWithStats,
  StatKey,
  SaveStatus,
  UndoAction,
} from '@/lib/types';
import { calculateTeamScore } from '@/lib/calculations';

// ── State ──────────────────────────────────────────────────────
interface LiveGameState {
  game: GameWithPlayers;
  saveStatus: SaveStatus;
  undoStack: UndoAction[];
  redoStack: UndoAction[];
  pendingWrites: number; // count of in-flight writes
}

type Action =
  | { type: 'OPTIMISTIC_UPDATE'; playerId: string; stat: StatKey; newValue: number; delta: number; playerName: string }
  | { type: 'SAVE_START' }
  | { type: 'SAVE_SUCCESS' }
  | { type: 'SAVE_ERROR'; playerId: string; stat: StatKey; revertValue: number }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'PUSH_UNDO'; action: UndoAction };

function updatePlayerStat(
  players: PlayerWithStats[],
  playerId: string,
  stat: StatKey,
  newValue: number
): PlayerWithStats[] {
  return players.map((p) =>
    p.id === playerId ? { ...p, stats: { ...p.stats, [stat]: newValue } } : p
  );
}

function gameReducer(state: LiveGameState, action: Action): LiveGameState {
  switch (action.type) {
    case 'OPTIMISTIC_UPDATE': {
      const { playerId, stat, newValue, delta, playerName } = action;
      const teamA = updatePlayerStat(state.game.players_a, playerId, stat, newValue);
      const teamB = updatePlayerStat(state.game.players_b, playerId, stat, newValue);
      const teamAScore = calculateTeamScore(teamA);
      const teamBScore = calculateTeamScore(teamB);

      const undoEntry: UndoAction = {
        playerId,
        playerName,
        stat,
        delta,
        timestamp: Date.now(),
      };

      return {
        ...state,
        game: {
          ...state.game,
          players_a: teamA,
          players_b: teamB,
          team_a_score: teamAScore,
          team_b_score: teamBScore,
        },
        undoStack: [undoEntry, ...state.undoStack].slice(0, 50),
        redoStack: [], // clear redo on new action
      };
    }

    case 'SAVE_START':
      return { ...state, saveStatus: 'saving', pendingWrites: state.pendingWrites + 1 };

    case 'SAVE_SUCCESS': {
      const pending = state.pendingWrites - 1;
      return {
        ...state,
        saveStatus: pending <= 0 ? 'saved' : 'saving',
        pendingWrites: Math.max(0, pending),
      };
    }

    case 'SAVE_ERROR': {
      const { playerId, stat, revertValue } = action;
      const teamA = updatePlayerStat(state.game.players_a, playerId, stat, revertValue);
      const teamB = updatePlayerStat(state.game.players_b, playerId, stat, revertValue);
      return {
        ...state,
        saveStatus: 'error',
        pendingWrites: Math.max(0, state.pendingWrites - 1),
        game: {
          ...state.game,
          players_a: teamA,
          players_b: teamB,
          team_a_score: calculateTeamScore(teamA),
          team_b_score: calculateTeamScore(teamB),
        },
      };
    }

    case 'PUSH_UNDO':
      return {
        ...state,
        undoStack: [action.action, ...state.undoStack].slice(0, 50),
        redoStack: [],
      };

    default:
      return state;
  }
}

// ── Hook ───────────────────────────────────────────────────────
export function useLiveGame(initialGame: GameWithPlayers) {
  const supabase = createClient();
  const [state, dispatch] = useReducer(gameReducer, {
    game: initialGame,
    saveStatus: 'idle',
    undoStack: [],
    redoStack: [],
    pendingWrites: 0,
  });

  // Store offline queue in ref so it doesn't cause re-renders
  const offlineQueue = useRef<Array<{ playerId: string; stat: StatKey; delta: number }>>([]);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushOfflineQueue = useCallback(async () => {
    const queue = [...offlineQueue.current];
    if (queue.length === 0) return;
    offlineQueue.current = [];

    for (const item of queue) {
      try {
        await supabase.rpc('increment_stat', {
          p_player_id: item.playerId,
          p_stat: item.stat,
          p_delta: item.delta,
        });
      } catch {
        // Put back at front
        offlineQueue.current.unshift(item);
      }
    }
  }, [supabase]);

  const recordStat = useCallback(
    async (player: PlayerWithStats, stat: StatKey, delta: number) => {
      const currentValue = player.stats[stat] as number;
      const newValue = Math.max(0, currentValue + delta);
      const actualDelta = newValue - currentValue; // may be 0 if already at 0

      if (actualDelta === 0) return;

      // 1. Optimistic update
      dispatch({
        type: 'OPTIMISTIC_UPDATE',
        playerId: player.id,
        stat,
        newValue,
        delta: actualDelta,
        playerName: player.name,
      });

      dispatch({ type: 'SAVE_START' });

      try {
        // 2. Atomic RPC — no read/write race condition
        const { error } = await supabase.rpc('increment_stat', {
          p_player_id: player.id,
          p_stat: stat,
          p_delta: actualDelta,
        });

        if (error) throw error;

        dispatch({ type: 'SAVE_SUCCESS' });
        
        // Flush any queued offline writes on success
        if (offlineQueue.current.length > 0) {
          flushOfflineQueue();
        }
      } catch {
        // Queue for retry
        offlineQueue.current.push({ playerId: player.id, stat, delta: actualDelta });

        // Schedule retry
        if (retryTimer.current) clearTimeout(retryTimer.current);
        retryTimer.current = setTimeout(flushOfflineQueue, 3000);

        dispatch({
          type: 'SAVE_ERROR',
          playerId: player.id,
          stat,
          revertValue: currentValue,
        });
      }
    },
    [supabase, flushOfflineQueue]
  );

  const undo = useCallback(async () => {
    const [last, ...rest] = state.undoStack;
    if (!last) return;

    // Find current value to revert
    const allPlayers = [...state.game.players_a, ...state.game.players_b];
    const player = allPlayers.find((p) => p.id === last.playerId);
    if (!player) return;

    const currentValue = player.stats[last.stat] as number;
    const revertedValue = Math.max(0, currentValue - last.delta);
    const reverseDelta = revertedValue - currentValue;

    if (reverseDelta === 0) return;

    dispatch({
      type: 'OPTIMISTIC_UPDATE',
      playerId: last.playerId,
      stat: last.stat,
      newValue: revertedValue,
      delta: reverseDelta,
      playerName: last.playerName,
    });

    // Remove from undo stack — replace with manual state update
    // We dispatch a custom action to only pop (not push to undo)
    dispatch({ type: 'SAVE_START' });
    
    try {
      await supabase.rpc('increment_stat', {
        p_player_id: last.playerId,
        p_stat: last.stat,
        p_delta: reverseDelta,
      });
      dispatch({ type: 'SAVE_SUCCESS' });
    } catch {
      dispatch({ type: 'SAVE_ERROR', playerId: last.playerId, stat: last.stat, revertValue: currentValue });
    }

    return last;
  }, [state.undoStack, state.game.players_a, state.game.players_b, supabase]);

  return {
    game: state.game,
    saveStatus: state.saveStatus,
    undoStack: state.undoStack,
    recordStat,
    undo,
    canUndo: state.undoStack.length > 0,
  };
}
