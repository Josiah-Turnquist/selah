import { Redirect } from 'expo-router';

import { useData } from '@/lib/store/store';

export default function Index() {
  const data = useData();
  return <Redirect href={data.settings.onboarded ? '/read' : '/onboarding'} />;
}
