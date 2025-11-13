import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HowItWorks from '@/app/how-it-works/page';

describe('How It Works Page', () => {
  it('renders the page title and description', () => {
    render(<HowItWorks />);
    
    expect(screen.getByText('How Grindproof Works')).toBeInTheDocument();
    expect(screen.getByText(/Three simple steps to stop lying to yourself/i)).toBeInTheDocument();
  });

  it('renders all three main steps', () => {
    render(<HowItWorks />);
    
    expect(screen.getByText('Morning Planning (9am)')).toBeInTheDocument();
    expect(screen.getByText('Task Validation System')).toBeInTheDocument();
    expect(screen.getByText('Evening Reality Check (6pm)')).toBeInTheDocument();
  });

  it('renders the weekly roast section', () => {
    render(<HowItWorks />);
    
    expect(screen.getByText('Weekly Roast Report (Sundays)')).toBeInTheDocument();
    expect(screen.getByText(/Every Sunday, we compile the most brutally honest summary/i)).toBeInTheDocument();
  });

  it('has navigation links', () => {
    render(<HowItWorks />);
    
    const brandLink = screen.getAllByText('Grindproof')[0];
    expect(brandLink).toHaveAttribute('href', '/');
    
    const ctaButton = screen.getByRole('link', { name: /Ready to Stop Bullshitting/i });
    expect(ctaButton).toHaveAttribute('href', '/dashboard');
  });

  it('renders auto-validation examples', () => {
    render(<HowItWorks />);
    
    expect(screen.getByText(/Dev work → GitHub commits/i)).toBeInTheDocument();
    expect(screen.getByText(/Meetings → Calendar attendance/i)).toBeInTheDocument();
    expect(screen.getByText(/Writing → Google Docs last modified/i)).toBeInTheDocument();
  });

  it('renders self-reported validation examples', () => {
    render(<HowItWorks />);
    
    expect(screen.getByText(/Gym → Upload workout selfie or Strava screenshot/i)).toBeInTheDocument();
    expect(screen.getByText(/Video editing → Share project file screenshot/i)).toBeInTheDocument();
  });
});

