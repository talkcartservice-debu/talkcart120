import React from 'react';
import { render, screen } from '@testing-library/react';
import UnifiedImageMedia from './UnifiedImageMedia';

// Mock console.log to reduce noise in tests
console.log = jest.fn();
console.warn = jest.fn();

describe('UnifiedImageMedia', () => {
  it('renders without crashing', () => {
    render(<UnifiedImageMedia src="http://localhost:8000/uploads/talkcart/test.jpg" alt="Test image" />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('handles localhost URLs correctly', () => {
    const { container } = render(
      <UnifiedImageMedia 
        src="http://localhost:8000/uploads/talkcart/file_1762529225547_3uzoa3u7b7o.jpg" 
        alt="Localhost image" 
      />
    );
    
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img?.src).toBe('http://localhost:8000/uploads/talkcart/file_1762529225547_3uzoa3u7b7o.jpg');
  });

  it('handles error states gracefully', () => {
    // Mock image error
    const originalImage = window.Image;
    (window.Image as any) = class MockImage {
      onload: () => void = () => {};
      onerror: () => void = () => {};
      src: string = '';
      
      constructor() {
        setTimeout(() => {
          this.onerror();
        }, 100);
        return this;
      }
    };
    
    const { container } = render(
      <UnifiedImageMedia 
        src="http://localhost:8000/uploads/talkcart/nonexistent.jpg" 
        alt="Non-existent image" 
      />
    );
    
    // Restore original Image
    window.Image = originalImage;
  });
});