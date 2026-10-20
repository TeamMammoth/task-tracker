import { test, expect } from '@playwright/test';

test('task state stays correct during rapid toggling', async ({ page }) => {
  await page.goto('/');

  // Create a task.
  await page.getByRole('textbox', { name: 'New task' })
    .fill('Buy milk');

  await page.getByRole('button', { name: 'Add task' })
    .click();

  const task = page.getByTestId('task-item')
    .filter({ hasText: 'Buy milk' });

  const checkbox = task.getByRole('checkbox');

  // Complete, undo, and complete again.
  await checkbox.click();
  await checkbox.click();
  await checkbox.click();

  // The final state must match the final action.
  await expect(checkbox).toBeChecked();
  await expect(task).toHaveAttribute('data-completed', 'true');

  // The interaction must not create duplicate tasks.
  await expect(
    page.getByTestId('task-item')
      .filter({ hasText: 'Buy milk' })
  ).toHaveCount(1);
});
