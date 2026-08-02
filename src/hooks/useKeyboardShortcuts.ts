import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimulation } from '../context/SimulationContext';
import { useFlightFilter } from './useFlightFilter';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const { togglePlay } = useSimulation();
  const { clearFlight } = useFlightFilter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key !== 'Escape') {
          return;
        }
      }

      switch (e.key) {
        case 'Escape':
          clearFlight();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          const searchInput = document.querySelector('.search-input') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
          }
          break;
        case '1':
          navigate('/flights');
          break;
        case '2':
          navigate('/gates');
          break;
        case '3':
          navigate('/baggage');
          break;
        case '4':
          navigate('/security');
          break;
        case '5':
          navigate('/staff');
          break;
        case '6':
          navigate('/retail');
          break;
        case 's':
        case 'S':
          togglePlay();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, togglePlay, clearFlight]);
}
