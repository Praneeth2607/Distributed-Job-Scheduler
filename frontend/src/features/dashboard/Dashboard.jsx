import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Folder, Plus, Server } from 'lucide-react';
import { JobsPanel } from './JobsPanel';
import { cn } from '../../utils/cn';

export const Dashboard = () => {
  const queryClient = useQueryClient();
  const [newOrgName, setNewOrgName] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newQueueName, setNewQueueName] = useState('');
  const [selectedQueueId, setSelectedQueueId] = useState(null);
  
  // 1. Fetch Orgs
  const { data: orgs = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const res = await api.get('/organizations');
      return res.data.data.organizations;
    },
  });

  const selectedOrg = orgs[0]; // For simplicity, auto-select first org

  // 2. Fetch Projects if org exists
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', selectedOrg?.id],
    queryFn: async () => {
      const res = await api.get(`/organizations/${selectedOrg.id}/projects`);
      return res.data.data.projects;
    },
    enabled: !!selectedOrg,
  });

  const selectedProject = projects[0];

  // 3. Fetch Queues if project exists
  const { data: queues = [] } = useQuery({
    queryKey: ['queues', selectedProject?.id],
    queryFn: async () => {
      const res = await api.get(`/organizations/${selectedOrg.id}/projects/${selectedProject.id}/queues`);
      return res.data.data.queues;
    },
    enabled: !!selectedProject,
    onSuccess: (data) => {
      // Auto select first queue if none selected
      if (data.length > 0 && !selectedQueueId) {
        setSelectedQueueId(data[0].id);
      }
    }
  });

  // Mutations
  const createOrg = useMutation({
    mutationFn: async (name) => api.post('/organizations', { name }),
    onSuccess: () => { queryClient.invalidateQueries(['organizations']); setNewOrgName(''); }
  });

  const createProject = useMutation({
    mutationFn: async (name) => api.post(`/organizations/${selectedOrg.id}/projects`, { name }),
    onSuccess: () => { queryClient.invalidateQueries(['projects']); setNewProjectName(''); }
  });

  const createQueue = useMutation({
    mutationFn: async (name) => api.post(`/organizations/${selectedOrg.id}/projects/${selectedProject.id}/queues`, { 
      name, 
      priority: 0,
      max_concurrency: 10
    }),
    onSuccess: () => { queryClient.invalidateQueries(['queues']); setNewQueueName(''); }
  });

  // UI States
  if (!orgs.length) {
    return (
      <Card className="max-w-md mx-auto mt-12">
        <CardHeader>
          <CardTitle>Welcome! Create an Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input 
              placeholder="e.g. Acme Corp" 
              value={newOrgName} 
              onChange={e => setNewOrgName(e.target.value)} 
            />
            <Button onClick={() => createOrg.mutate(newOrgName)}>Create</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!projects.length) {
    return (
      <Card className="max-w-md mx-auto mt-12">
        <CardHeader>
          <CardTitle>Create your first Project</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input 
              placeholder="e.g. Video Processor" 
              value={newProjectName} 
              onChange={e => setNewProjectName(e.target.value)} 
            />
            <Button onClick={() => createProject.mutate(newProjectName)}>Create</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{selectedProject.name} Dashboard</h2>
          <p className="text-sm text-gray-500">Manage queues and jobs for this project.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Queues List */}
        <div className="md:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Server className="h-5 w-5 text-gold-500" />
                Active Queues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {queues.length === 0 ? (
                  <p className="text-sm text-gray-500">No queues created yet.</p>
                ) : (
                  queues.map(q => (
                    <div 
                      key={q.id} 
                      onClick={() => setSelectedQueueId(q.id)}
                      className={cn(
                        "p-3 border rounded-md flex justify-between items-center cursor-pointer transition-colors",
                        selectedQueueId === q.id 
                          ? "bg-gold-50 border-gold-400" 
                          : "bg-ivory border-border hover:border-gold-400"
                      )}
                    >
                      <div className="font-medium text-charcoal">{q.name}</div>
                      <div className="text-xs text-gray-500">Max {q.max_concurrency}</div>
                    </div>
                  ))
                )}
                
                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                  <Input 
                    placeholder="New queue name..." 
                    value={newQueueName}
                    onChange={e => setNewQueueName(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Button size="sm" onClick={() => createQueue.mutate(newQueueName)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Jobs Area */}
        <div className="md:col-span-2 space-y-4">
          {selectedQueueId ? (
            <JobsPanel queueId={selectedQueueId} />
          ) : (
            <Card className="min-h-[400px] flex items-center justify-center bg-ivory border-dashed border-border border-2">
              <p className="text-gray-500 font-medium">Select a queue to view jobs</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
