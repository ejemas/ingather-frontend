import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import OnboardingModal from './OnboardingModal';

test('saves the picked type and shows it is saving', async () => {
  let finish;
  const onSelect = jest.fn(() => new Promise((resolve) => { finish = resolve; }));
  render(<OnboardingModal onSelect={onSelect} />);
  expect(screen.getByRole('heading', { name: 'Welcome to Ingather. What do you mostly run?' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Church or ministry/ }));
  expect(onSelect).toHaveBeenCalledWith('church');
  expect(screen.getByText('Saving your choice…')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Conferences/ })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: /Conferences/ }));
  expect(onSelect).toHaveBeenCalledTimes(1);
  finish();
});

test('lets the organizer pick again if saving fails', async () => {
  const onSelect = jest.fn().mockRejectedValue(new Error('Network Error'));
  render(<OnboardingModal onSelect={onSelect} />);
  fireEvent.click(screen.getByRole('button', { name: /Tech meetups/ }));
  expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't save that. Check your connection and pick again.");
  await waitFor(() => expect(screen.getByRole('button', { name: /Seminars/ })).not.toBeDisabled());
});
