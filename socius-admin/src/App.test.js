import { render, screen } from '@testing-library/react';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';

test('renders Socius Admin title', () => {
  render(
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
  const titleElement = screen.getByText(/Admin Login/i);
  expect(titleElement).toBeInTheDocument();
});
