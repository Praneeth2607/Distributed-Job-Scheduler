import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { format } from 'date-fns';
import { Play, Clock, CheckCircle2, XCircle, RefreshCw, Trash2 } from 'lucide-react';
import { cn } from '../../utils/cn';

const StatusBadge = ({ status }) => {
  const styles = {
    queued: 'bg-gray-100 text-gray-700 border-gray-200',
    claimed: 'bg-blue-50 text-blue-700 border-blue-200',
    running: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    completed: 'bg-green-50 text-green-700 border-green-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
    retrying: 'bg-orange-50 text-orange-700 border-orange-200',
  };

  const icons = {
    queued: <Clock className="w-3 h-3 mr-1" />,
    claimed: <Play className="w-3 h-3 mr-1" />,
    running: <RefreshCw className="w-3 h-3 mr-1 animate-spin" />,
    completed: <CheckCircle2 className="w-3 h-3 mr-1" />,
    failed: <XCircle className="w-3 h-3 mr-1" />,
    retrying: <RefreshCw className="w-3 h-3 mr-1" />,
  };

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border', styles[status] || styles.queued)}>
      {icons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export const JobsPanel = ({ queueId, orgId, projectId }) => {
  const queryClient = useQueryClient();
  const [newJobName, setNewJobName] = useState('');

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs', queueId],
    queryFn: async () => {
      const res = await api.get(`/organizations/${orgId}/projects/${projectId}/queues/${queueId}/jobs`);
      return res.data.data.jobs;
    },
    refetchInterval: 3000, // Poll every 3s to watch job progress
    enabled: !!queueId
  });

  const submitJob = useMutation({
    mutationFn: async (name) => api.post(`/organizations/${orgId}/projects/${projectId}/queues/${queueId}/jobs`, {
      name,
      payload: { test: true }
    }),
    onSuccess: () => { 
      queryClient.invalidateQueries(['jobs', queueId]); 
      setNewJobName('');
    }
  });

  const deleteJob = useMutation({
    mutationFn: async (jobId) => api.delete(`/organizations/${orgId}/projects/${projectId}/queues/${queueId}/jobs/${jobId}`),
    onSuccess: () => queryClient.invalidateQueries(['jobs', queueId])
  });

  const clearJobs = useMutation({
    mutationFn: async () => api.delete(`/organizations/${orgId}/projects/${projectId}/queues/${queueId}/jobs`),
    onSuccess: () => queryClient.invalidateQueries(['jobs', queueId])
  });

  return (
    <Card className="min-h-[500px]">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
        <CardTitle className="text-lg">Job Explorer</CardTitle>
        <div className="flex gap-2">
          <select 
            className="h-9 rounded-md border border-border px-3 text-sm"
            value={newJobName}
            onChange={e => setNewJobName(e.target.value)}
          >
            <option value="send_email">Send Email Job</option>
            <option value="process_data">Process Data Job</option>
            <option value="unknown_job">Failing Job (Test DLQ)</option>
          </select>
          <Button size="sm" onClick={() => submitJob.mutate(newJobName)}>
            Submit Job
          </Button>
          <Button size="sm" variant="danger" onClick={() => {
            if(confirm('Clear all jobs in this queue?')) clearJobs.mutate();
          }}>
            Clear Queue
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 overflow-hidden">
        {jobs.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No jobs in this queue yet. Submit one above!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-surface border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Retries</th>
                  <th className="px-4 py-3 font-medium">Created At</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono text-xs">
                {jobs.map(job => (
                  <tr key={job.id} className="hover:bg-gray-50 group">
                    <td className="px-4 py-3 text-gray-400">...{job.id.slice(-6)}</td>
                    <td className="px-4 py-3 font-sans font-medium text-charcoal">{job.name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-500">{job.current_retries}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {format(new Date(job.created_at), 'HH:mm:ss.SSS')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteJob.mutate(job.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
