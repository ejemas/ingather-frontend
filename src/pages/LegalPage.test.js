import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import LegalPage from './LegalPage';
import NotFound from './NotFound';

jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...rest }) => <a href={to} {...rest}>{children}</a>
}), { virtual: true });

describe('Legal pages', () => {
  test('privacy page lists every section and shows no unfilled details', () => {
    render(<LegalPage doc="privacy" />);
    expect(document.title).toBe('Privacy Policy | Ingather');
    expect(screen.getByRole('navigation', { name: 'On this page' })).toHaveTextContent('Your rights');
    expect(screen.getByText('Last updated 5 August 2026')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\[|\]|undefined|Draft text/);
    expect(screen.getByText(/When an organizer deletes an event/).textContent.startsWith('When')).toBe(true);
    expect(screen.getByText(/Nigeria Data Protection Act 2023/)).toBeInTheDocument();
  });

  test('terms page marks its own tab as current', () => {
    render(<LegalPage doc="terms" />);
    expect(screen.getByRole('link', { name: 'Terms of Use', current: 'page' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Governing law and contact' })).toBeInTheDocument();
    expect(screen.getByText(/cannot promise it will always be available\.$/)).toBeInTheDocument();
  });

  test('contact page links the email and asks for a message before sending', () => {
    render(<LegalPage doc="contact" />);
    expect(screen.getByRole('link', { name: /General questions/ })).toHaveAttribute('href', expect.stringContaining('mailto:ingatherr@gmail.com'));
    expect(screen.getByText(/We usually reply within 24 hours/)).toBeInTheDocument();
    fireEvent.submit(screen.getByRole('button', { name: 'Send message' }).closest('form'));
    expect(screen.getByRole('alert')).toHaveTextContent('Write a short message');
  });
});

describe('Not found page', () => {
  test('shows the broken-link page with ways out', () => {
    render(<NotFound />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent("This page doesn't exist");
    expect(screen.getByRole('link', { name: 'Discover events' })).toHaveAttribute('href', '/discover');
    expect(screen.getByRole('link', { name: 'Report a broken link' })).toHaveAttribute('href', '/contact');
  });

  test('event variant explains the RSVP link is not active', () => {
    render(<NotFound kind="event" />);
    expect(screen.getByText('This RSVP link is not active')).toBeInTheDocument();
  });
});
