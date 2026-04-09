import { useState, useCallback } from 'react';

/** Standard pull-to-refresh styling for Daily Help and related flows */
export const sociusRefreshProps = {
  colors: ['#DC5C69'],
  tintColor: '#DC5C69',
};

/** For screens with no remote reload: finishes after `minMs` so the spinner does not stick. */
export function useStaticPullRefresh(minMs = 450) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), minMs);
  }, [minMs]);
  return { refreshing, onRefresh };
}
