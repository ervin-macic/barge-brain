import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { AUTH_SESSION_KEY } from './data/constants';

function renderAuthenticated() {
  sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
  return render(<App />);
}

afterEach(() => {
  sessionStorage.clear();
});

test('shows login page by default', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
});

test('shows error on wrong credentials', async () => {
  render(<App />);
  await userEvent.type(screen.getByLabelText(/username/i), 'wrong');
  await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
  expect(screen.getByText(/incorrect username or password/i)).toBeInTheDocument();
});

test('signs in with correct credentials', async () => {
  render(<App />);
  await userEvent.type(screen.getByLabelText(/username/i), 'admin');
  await userEvent.type(screen.getByLabelText(/password/i), 'BargeBrain');
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
  expect(screen.getByRole('heading', { name: /barge planner/i })).toBeInTheDocument();
});

test('renders Barge Planner heading when already authenticated', () => {
  renderAuthenticated();
  expect(screen.getByRole('heading', { name: /barge planner/i })).toBeInTheDocument();
});

test('renders navigation buttons for each view when authenticated', () => {
  renderAuthenticated();
  expect(screen.getByRole('button', { name: /^barge view$/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^weekly barge view$/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^transport capacity$/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^route planner$/i })).toBeInTheDocument();
});
