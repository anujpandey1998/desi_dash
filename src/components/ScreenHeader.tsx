import React from 'react';
import { Button, Header } from './ui';

export function ScreenHeader({ title, subtitle, onBack, trailing }: { title: string; subtitle?: string; onBack: () => void; trailing?: React.ReactNode }) {
  return <Header title={title} subtitle={subtitle} leading={<Button title="‹" compact tone="panel" onPress={onBack} accessibilityLabel="Go back" style={{ width: 50 }} />} trailing={trailing} />;
}
