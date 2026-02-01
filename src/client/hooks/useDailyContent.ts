import { useCallback, useEffect, useState } from 'react';
import type { DailyDungeonResponse } from '../../shared/types/api';

interface DailyContentState {
  layout: string;
  monster: string;
  modifier: string;
  date: string;
  loading: boolean;
  error: string | null;
}

// Default dungeon layout - cross pattern
const DEFAULT_LAYOUT = '0000110000000011000000001100001111111111111111111100001100000000110000000011000000001100000000110000';

export const useDailyContent = () => {
  const [state, setState] = useState<DailyContentState>({
    layout: DEFAULT_LAYOUT,
    monster: 'Goblin',
    modifier: 'Normal',
    date: new Date().toISOString().split('T')[0] || '',
    loading: true,
    error: null,
  });

  const fetchContent = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Try the new dungeon endpoint first
      const res = await fetch('/api/daily-dungeon');
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const data: DailyDungeonResponse = await res.json();
      
      setState({
        layout: data.layout || DEFAULT_LAYOUT,
        monster: data.monster || 'Goblin',
        modifier: data.modifier || 'Normal',
        date: data.date || new Date().toISOString().split('T')[0] || '',
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error('Failed to fetch daily dungeon:', err);
      
      // Use defaults on error
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load dungeon. Using default layout.',
      }));
    }
  }, []);

  useEffect(() => {
    void fetchContent();
  }, [fetchContent]);

  return { ...state, refetch: fetchContent };
};