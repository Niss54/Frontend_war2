import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFilter } from '../context/FilterContext';
import { useSimulation } from '../context/SimulationContext';

export const useKeyboardShortcuts = (toggleAlertPanel: () => void) => {
  const navigate = useNavigate();
  const { clearAllFilters, setSelectedFlight } = useFilter();
  const { togglePlay } = useSimulation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        // Only allow ESC to blur/escape
        if (e.key === 'Escape') {
          (document.activeElement as HTMLElement).blur();
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'escape':
          e.preventDefault();
          clearAllFilters();
          setSelectedFlight(null);
          // if panels are open, we might want to close them here too
          break;
          
        case 'f':
          e.preventDefault();
          const searchInput = document.getElementById('global-search');
          if (searchInput) searchInput.focus();
          break;
          
        case 'a':
          e.preventDefault();
          toggleAlertPanel();
          break;
          
        case 's':
          e.preventDefault();
          togglePlay();
          break;
          
        case '1':
          e.preventDefault(); navigate('/flights'); break;
        case '2':
          e.preventDefault(); navigate('/gates'); break;
        case '3':
          e.preventDefault(); navigate('/baggage'); break;
        case '4':
          e.preventDefault(); navigate('/security'); break;
        case '5':
          e.preventDefault(); navigate('/staff'); break;
        case '6':
          e.preventDefault(); navigate('/retail'); break;
          
        case 'k':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            // TODO: Command Palette AW-12
            console.log('Open Command Palette (AW-12)');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, clearAllFilters, setSelectedFlight, toggleAlertPanel, togglePlay]);
};
