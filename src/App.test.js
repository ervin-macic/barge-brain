import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Barge Planner heading', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /barge planner/i })).toBeInTheDocument();
});

test('renders navigation buttons for each view', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: /^barge view$/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^weekly barge view$/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^transport capacity$/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^route planner$/i })).toBeInTheDocument();
});
