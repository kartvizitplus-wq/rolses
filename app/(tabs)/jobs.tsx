import React, { useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { api } from '../../src/data';
import { useAuth } from '../../src/lib/auth';
import { useLoader } from '../../src/lib/useAsync';
import { TaskCard } from '../../src/components/cards';
import { Button, Card, Empty, ErrorBox, Loading, Row, Screen, Segmented, StatusPill } from '../../src/components/ui';
import { font, space } from '../../src/theme';
import { formatTL } from '../../src/lib/pricing';
import { timeAgo } from '../../src/lib/id';

type Tab = 'orders' | 'tasks' | 'applications';

export default function Jobs() {
  const { userId } = useAuth();
  const [tab, setTab] = useState<Tab>('orders');

  if (!userId) {
    return (
      <Screen>
        <Empty
          icon="briefcase-outline"
          title="İşlerinizi görmek için giriş yapın"
          action={<Button title="Giriş yap" onPress={() => router.push('/login')} />}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'orders', label: 'Süren işler' },
          { value: 'tasks', label: 'Görevlerim' },
          { value: 'applications', label: 'Başvurularım' },
        ]}
      />
      <Text style={{ height: space(4) }} />
      {tab === 'orders' ? <Orders userId={userId} /> : null}
      {tab === 'tasks' ? <MyTasks /> : null}
      {tab === 'applications' ? <MyApplications /> : null}
    </Screen>
  );
}

function Orders({ userId }: { userId: string }) {
  const { data, loading, error } = useLoader(() => api.listMyOrders(), [userId]);
  if (error) return <ErrorBox text={error} />;
  if (loading && !data) return <Loading />;
  if (!data?.length) {
    return (
      <Empty
        icon="hourglass-outline"
        title="Henüz süren bir iş yok"
        text="Bir başvuruyu seçtiğinizde ya da bir role seçildiğinizde iş burada görünür."
      />
    );
  }
  return (
    <>
      {data.map((o) => {
        const owner = o.owner_id === userId;
        return (
          <Card key={o.id} onPress={() => router.push(`/order/${o.id}`)}>
            <Row style={{ justifyContent: 'space-between', marginBottom: space(2) }}>
              <Text style={font.label}>{owner ? 'Görev verdiğin' : 'Seslendirdiğin'}</Text>
              <StatusPill status={o.status} />
            </Row>
            <Text style={font.h3}>
              {o.role?.name} · {formatTL(Number(o.amount))}
            </Text>
            <Text style={font.small} numberOfLines={1}>
              {o.task?.title}
            </Text>
            <Text style={[font.small, { marginTop: space(1) }]}>
              {owner ? `Seslendirmen: ${o.talent?.display_name ?? ''}` : `Görev veren: ${o.owner?.display_name ?? ''}`} ·{' '}
              {timeAgo(o.created_at)}
            </Text>
          </Card>
        );
      })}
    </>
  );
}

function MyTasks() {
  const { data, loading, error } = useLoader(() => api.listMyTasks(), []);
  if (error) return <ErrorBox text={error} />;
  if (loading && !data) return <Loading />;
  if (!data?.length) {
    return (
      <Empty
        icon="add-circle-outline"
        title="Henüz görev vermediniz"
        action={<Button title="Görev ver" icon="add" onPress={() => router.push('/create')} />}
      />
    );
  }
  return (
    <>
      {data.map((t) => (
        <TaskCard key={t.id} task={t} showStatus />
      ))}
    </>
  );
}

function MyApplications() {
  const { data, loading, error } = useLoader(() => api.listMyApplications(), []);
  if (error) return <ErrorBox text={error} />;
  if (loading && !data) return <Loading />;
  if (!data?.length) {
    return (
      <Empty
        icon="mic-outline"
        title="Henüz başvurunuz yok"
        text="Keşfet sekmesinden bir role 30 saniyede sesli başvurabilirsiniz."
        action={<Button title="Görevlere bak" onPress={() => router.push('/')} />}
      />
    );
  }
  return (
    <>
      {data.map((a) => (
        <Card key={a.id} onPress={() => router.push(`/task/${a.task_id}`)}>
          <Row style={{ justifyContent: 'space-between', marginBottom: space(2) }}>
            <Text style={font.h3}>{a.role_name}</Text>
            <StatusPill status={a.status} />
          </Row>
          <Text style={font.small} numberOfLines={2}>
            {a.task_title}
          </Text>
          <Text style={[font.small, { marginTop: space(1) }]}>{timeAgo(a.created_at)}</Text>
        </Card>
      ))}
    </>
  );
}
