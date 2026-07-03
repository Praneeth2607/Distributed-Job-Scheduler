import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Folder, Plus, Server, Trash2, Pause, Play } from 'lucide-react';
import { JobsPanel } from './JobsPanel';
import { WorkerMonitor } from './WorkerMonitor';
import { cn } from '../../utils/cn';

export const Dashboard = () => {
  const queryClient = useQueryClient();
  const [newOrgName, setNewOrgName] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newQueueName, setNewQueueName] = useState('');
  const [selectedQueueId, setSelectedQueueId] = useState(null);
  
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  
  // 1. Fetch Orgs
  const { data: orgs = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const res = await api.get('/organizations');
      return res.data.data.organizations;
    },
  });

  const selectedOrg = selectedOrgId ? orgs.find(o => o.id === selectedOrgId) : orgs[0];

  // 2. Fetch Projects if org exists
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', selectedOrg?.id],
    queryFn: async () => {
      const res = await api.get(`/organizations/${selectedOrg.id}/projects`);
      return res.data.data.projects;
    },
    enabled: !!selectedOrg,
  });

  const selectedProject = selectedProjectId ? projects.find(p => p.id === selectedProjectId) : projects[0];

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

  const deleteQueue = useMutation({
    mutationFn: async (queueId) => api.delete(`/organizations/${selectedOrg.id}/projects/${selectedProject.id}/queues/${queueId}`),
    onSuccess: () => { 
      queryClient.invalidateQueries(['queues']); 
      setSelectedQueueId(null);
    }
  });

  const pauseQueue = useMutation({
    mutationFn: async (queueId) => api.post(`/organizations/${selectedOrg.id}/projects/${selectedProject.id}/queues/${queueId}/pause`),
    onSuccess: () => { queryClient.invalidateQueries(['queues']); }
  });

  const resumeQueue = useMutation({
    mutationFn: async (queueId) => api.post(`/organizations/${selectedOrg.id}/projects/${selectedProject.id}/queues/${queueId}/resume`),
    onSuccess: () => { queryClient.invalidateQueries(['queues']); }
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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{selectedProject?.name || 'Loading...'} Dashboard</h2>
          <p className="text-sm text-gray-500">Manage queues and jobs for this project.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-md border border-border shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Org:</span>
            <select 
              className="text-sm border-none bg-transparent font-medium text-charcoal focus:ring-0 cursor-pointer"
              value={selectedOrg?.id || ''}
              onChange={(e) => {
                setSelectedOrgId(e.target.value);
                setSelectedProjectId(null); // Reset project when org changes
                setSelectedQueueId(null); // Reset queue when org changes
              }}
            >
              {orgs.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>
          <div className="w-px h-6 bg-border"></div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Project:</span>
            <select 
              className="text-sm border-none bg-transparent font-medium text-charcoal focus:ring-0 cursor-pointer"
              value={selectedProject?.id || ''}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setSelectedQueueId(null); // Reset queue when project changes
              }}
            >
              {projects.map(proj => (
                <option key={proj.id} value={proj.id}>{proj.name}</option>
              ))}
            </select>
          </div>
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
                        "p-3 border rounded-md flex justify-between items-center cursor-pointer transition-colors group",
                        selectedQueueId === q.id 
                          ? "bg-gold-50 border-gold-400" 
                          : "bg-ivory border-border hover:border-gold-400"
                      )}
                    >
                      <div>
                        <div className="font-medium text-charcoal flex items-center gap-2">
                          {q.name}
                          {q.is_paused && <span className="px-1.5 py-0.5 rounded text-[10px] bg-orange-100 text-orange-700 font-bold tracking-wider uppercase">Paused</span>}
                        </div>
                        <div className="text-xs text-gray-500">Max {q.max_concurrency}</div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {q.is_paused ? (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-green-600 hover:bg-green-50"
                            onClick={(e) => { e.stopPropagation(); resumeQueue.mutate(q.id); }}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-orange-500 hover:bg-orange-50"
                            onClick={(e) => { e.stopPropagation(); pauseQueue.mutate(q.id); }}
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-500 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            if(confirm('Are you sure you want to delete this queue and all its jobs?')) {
                              deleteQueue.mutate(q.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
                  <Button 
                    size="sm" 
                    onClick={() => {
                      if (newQueueName.trim()) {
                        createQueue.mutate(newQueueName.trim());
                      }
                    }}
                    disabled={!newQueueName.trim()}
                  >
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
            <JobsPanel 
              queueId={selectedQueueId} 
              orgId={selectedOrg.id}
              projectId={selectedProject.id}
            />
          ) : (
            <Card className="min-h-[400px] flex items-center justify-center bg-ivory border-dashed border-border border-2">
              <p className="text-gray-500 font-medium">Select a queue to view jobs</p>
            </Card>
          )}
        </div>
      </div>

      <WorkerMonitor />
    </div>
  );
};
