import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Activity, ServerCrash } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { formatDistanceToNow } from 'date-fns';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export const WorkerMonitor = () => {
  const { data: workers = [] } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const res = await api.get('/workers');
      return res.data.data.workers;
    },
    refetchInterval: 5000,
  });

  const chartData = {
    labels: workers.map(w => w.hostname),
    datasets: [
      {
        label: 'Memory Usage (MB)',
        data: workers.map(w => w.memory_usage || 0),
        backgroundColor: '#D4AF37', // Gold 400
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: false },
    },
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-gold-500" />
          Worker Fleet Monitor
        </CardTitle>
      </CardHeader>
      <CardContent>
        {workers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-gray-500">
            <ServerCrash className="h-8 w-8 mb-2" />
            <p>No active workers found. Run `node src/worker/daemon.js` to start one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-surface border-b border-border">
                  <tr>
                    <th className="px-4 py-3 font-medium">Hostname</th>
                    <th className="px-4 py-3 font-medium">PID</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Last Heartbeat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {workers.map(w => (
                    <tr key={w.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-charcoal">{w.hostname}</td>
                      <td className="px-4 py-3 text-gray-500">{w.pid}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                          {w.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {w.last_heartbeat ? formatDistanceToNow(new Date(w.last_heartbeat), { addSuffix: true }) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="h-64 border border-border rounded-lg p-4 bg-ivory">
              <Bar options={chartOptions} data={chartData} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
