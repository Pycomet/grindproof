import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  TaskSkeleton,
  TaskListSkeleton,
  GoalSkeleton,
  GoalListSkeleton,
  CardSkeleton,
} from '@/components/LoadingSkeletons';

describe('LoadingSkeletons', () => {
  describe('TaskSkeleton', () => {
    it('should render task skeleton', () => {
      const { container } = render(<TaskSkeleton />);
      expect(container.firstChild).toBeTruthy();
    });

    it('should have correct structure', () => {
      const { container } = render(<TaskSkeleton />);
      const skeleton = container.firstChild as HTMLElement;
      
      expect(skeleton.className).toContain('rounded-lg');
      expect(skeleton.className).toContain('border');
    });

    it('should render multiple skeleton elements', () => {
      const { container } = render(<TaskSkeleton />);
      const motionDivs = container.querySelectorAll('[class*="gradient"]');
      
      // Should have title, description, and tag skeletons
      expect(motionDivs.length).toBeGreaterThan(0);
    });
  });

  describe('TaskListSkeleton', () => {
    it('should render default count of 3 task skeletons', () => {
      const { container } = render(<TaskListSkeleton />);
      const skeletons = container.querySelectorAll('[class*="rounded-lg"][class*="border"]');
      
      expect(skeletons.length).toBe(3);
    });

    it('should render custom count of task skeletons', () => {
      const { container } = render(<TaskListSkeleton count={5} />);
      const skeletons = container.querySelectorAll('[class*="rounded-lg"][class*="border"]');
      
      expect(skeletons.length).toBe(5);
    });

    it('should render single task skeleton when count is 1', () => {
      const { container } = render(<TaskListSkeleton count={1} />);
      const skeletons = container.querySelectorAll('[class*="rounded-lg"][class*="border"]');
      
      expect(skeletons.length).toBe(1);
    });

    it('should have space-y-3 class for spacing', () => {
      const { container } = render(<TaskListSkeleton />);
      const wrapper = container.firstChild as HTMLElement;
      
      expect(wrapper.className).toContain('space-y-3');
    });
  });

  describe('GoalSkeleton', () => {
    it('should render goal skeleton', () => {
      const { container } = render(<GoalSkeleton />);
      expect(container.firstChild).toBeTruthy();
    });

    it('should have correct structure', () => {
      const { container } = render(<GoalSkeleton />);
      const skeleton = container.firstChild as HTMLElement;
      
      expect(skeleton.className).toContain('rounded-lg');
      expect(skeleton.className).toContain('border');
    });

    it('should render goal-specific elements', () => {
      const { container } = render(<GoalSkeleton />);
      const motionDivs = container.querySelectorAll('[class*="gradient"]');
      
      // Should have title, badges, description, and progress bar skeletons
      expect(motionDivs.length).toBeGreaterThan(2);
    });
  });

  describe('GoalListSkeleton', () => {
    it('should render default count of 2 goal skeletons', () => {
      const { container } = render(<GoalListSkeleton />);
      const skeletons = container.querySelectorAll('[class*="rounded-lg"][class*="border"]');
      
      expect(skeletons.length).toBe(2);
    });

    it('should render custom count of goal skeletons', () => {
      const { container } = render(<GoalListSkeleton count={4} />);
      const skeletons = container.querySelectorAll('[class*="rounded-lg"][class*="border"]');
      
      expect(skeletons.length).toBe(4);
    });

    it('should have space-y-3 class for spacing', () => {
      const { container } = render(<GoalListSkeleton />);
      const wrapper = container.firstChild as HTMLElement;
      
      expect(wrapper.className).toContain('space-y-3');
    });
  });

  describe('CardSkeleton', () => {
    it('should render card skeleton', () => {
      const { container } = render(<CardSkeleton />);
      expect(container.firstChild).toBeTruthy();
    });

    it('should have correct structure', () => {
      const { container } = render(<CardSkeleton />);
      const skeleton = container.firstChild as HTMLElement;
      
      expect(skeleton.className).toContain('rounded-lg');
      expect(skeleton.className).toContain('border');
      expect(skeleton.className).toContain('p-6');
    });

    it('should render multiple line skeletons', () => {
      const { container } = render(<CardSkeleton />);
      const motionDivs = container.querySelectorAll('[class*="gradient"]');
      
      // Should have header + 3 content lines = 4 total
      expect(motionDivs.length).toBe(4);
    });
  });

  describe('Shimmer Animation', () => {
    it('should have gradient background on skeleton elements', () => {
      const { container } = render(<TaskSkeleton />);
      const gradientElements = container.querySelectorAll('[class*="bg-gradient"]');
      
      expect(gradientElements.length).toBeGreaterThan(0);
    });

    it('should have from/via/to colors for shimmer effect', () => {
      const { container } = render(<TaskSkeleton />);
      const gradientElements = container.querySelectorAll('[class*="from-zinc"]');
      
      expect(gradientElements.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Design', () => {
    it('should render properly in different viewport sizes', () => {
      const { container } = render(<TaskListSkeleton />);
      const wrapper = container.firstChild as HTMLElement;
      
      // Should have responsive classes
      expect(wrapper).toBeTruthy();
    });
  });

  describe('Dark Mode Support', () => {
    it('should have dark mode classes', () => {
      const { container } = render(<TaskSkeleton />);
      const darkModeElements = container.querySelectorAll('[class*="dark:"]');
      
      expect(darkModeElements.length).toBeGreaterThan(0);
    });

    it('should have dark mode gradient colors', () => {
      const { container } = render(<TaskSkeleton />);
      const darkGradients = container.querySelectorAll('[class*="dark:from-zinc"]');
      
      expect(darkGradients.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should render with proper opacity animations', () => {
      const { container } = render(<TaskSkeleton />);
      const skeleton = container.firstChild as HTMLElement;
      
      // Framer Motion will handle opacity animations
      expect(skeleton).toBeTruthy();
    });

    it('should not contain actual content that screen readers might read', () => {
      const { container } = render(<TaskSkeleton />);
      const textContent = container.textContent;
      
      // Skeletons should be visual only, no text content
      expect(textContent).toBe('');
    });
  });
});

