import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import DataRefreshNotice from '../src/components/DataRefreshNotice';
import OfflineState from '../src/components/OfflineState';
import { I18nProvider, translateFor } from '../src/lib/i18n';

function localized(children: React.ReactNode, language: 'en' | 'te' = 'en') {
  return render(<I18nProvider accountLanguage={language}>{children}</I18nProvider>);
}

describe('shared data states', () => {
  it('renders a localized semantic offline state without a dead retry action', async () => {
    await localized(<OfflineState />, 'te');

    expect(
      screen.getByRole('header', { name: translateFor('te', 'network.offlineTitle') }),
    ).toBeTruthy();
    const body = screen.getByText(translateFor('te', 'network.offlineBody'));
    expect(body.props.accessibilityLiveRegion).toBe('polite');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('announces a background update without showing Retry', async () => {
    await localized(<DataRefreshNotice updating failed={false} onRetry={jest.fn()} />);

    const updating = screen.getByText(translateFor('en', 'refresh.updating'));
    expect(updating.props.accessibilityLiveRegion).toBe('polite');
    expect(updating.props.accessibilityRole).toBeUndefined();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('keeps cached content in place and exposes a working refresh retry', async () => {
    const onRetry = jest.fn();
    await localized(<DataRefreshNotice updating={false} failed onRetry={onRetry} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(translateFor('en', 'refresh.failedUsingSaved'));
    expect(alert.props.accessibilityLiveRegion).toBe('assertive');
    await fireEvent.press(
      screen.getByRole('button', { name: translateFor('en', 'common.tryAgain') }),
    );
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when loaded data is current', async () => {
    const view = await localized(
      <DataRefreshNotice updating={false} failed={false} onRetry={jest.fn()} />,
    );
    expect(view.toJSON()).toBeNull();
  });
});
