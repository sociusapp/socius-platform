import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAlert } from '../hooks/useAlert';
import Card from '../components/common/Card';
import Button from '../components/common/Button';

const LiveAwarenessDetailsPage = () => {
  const { id } = useParams();
  const { confirm, toast } = useAlert();
  const [processingAction, setProcessingAction] = useState(null);

  const handleFreeze = async () => {
    const result = await confirm({
      title: 'Freeze Awareness?',
      text: "This will stop all updates and interactions for this awareness request.",
      icon: 'warning',
      confirmButtonText: 'Yes, freeze it',
      confirmButtonColor: 'bg-red-600 hover:bg-red-700 text-white',
    });
    
    if (result.isConfirmed) {
      setProcessingAction('freeze');
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      setProcessingAction(null);
      toast.success('Awareness frozen successfully');
    }
  };

  const handleMerge = async () => {
    const result = await confirm({
      title: 'Merge Awareness?',
      text: "Select another awareness request to merge this into.",
      icon: 'info',
      confirmButtonText: 'Proceed to merge',
    });
    
    if (result.isConfirmed) {
      setProcessingAction('merge');
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      setProcessingAction(null);
      toast.success('Merge wizard opened');
    }
  };

  const handleClose = async () => {
    const result = await confirm({
      title: 'Close Awareness?',
      text: "This will mark the request as resolved/closed.",
      icon: 'question',
      confirmButtonText: 'Yes, close it',
    });
    
    if (result.isConfirmed) {
      setProcessingAction('close');
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      setProcessingAction(null);
      toast.success('Awareness closed successfully');
    }
  };

  // Mock data to match the screenshot exactly
  // In a real app, you would fetch this based on the `id`
  const incidentData = {
    id: 'AWR-23918',
    category: 'Calm Presence',
    status: 'Open',
    createdAt: '12:42 PM',
    timeActive: '18 minutes',
    timeline: [
      { time: '12:42 PM', event: 'Awareness created', type: 'normal' },
      { time: '12:45 PM', event: 'First views by nearby users', type: 'normal' },
      { time: '12:50 PM', event: '5 volunteers viewed', type: 'normal' },
      { time: '12:58 PM', event: 'Flag raised: Repeated requests', type: 'alert' },
    ],
    stats: {
      usersViewed: 7,
      volunteersOpened: 3,
      volunteersNearby: 1
    },
    flag: {
      type: 'Repeated Requests',
      source: 'System'
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Awareness ID: {incidentData.id}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Live awareness request — information view only
        </p>
      </div>

      {/* Awareness Summary Card */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-socius-red mb-4">Awareness Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12">
          <div className="space-y-4">
            <div className="flex">
              <span className="text-gray-500 dark:text-gray-400 w-24">Category:</span>
              <span className="font-bold text-gray-800 dark:text-white">{incidentData.category}</span>
            </div>
            <div className="flex">
              <span className="text-gray-500 dark:text-gray-400 w-24">Created at:</span>
              <span className="font-bold text-gray-800 dark:text-white">{incidentData.createdAt}</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex">
              <span className="text-gray-500 dark:text-gray-400 w-24">Status:</span>
              <span className="font-bold text-gray-800 dark:text-white">{incidentData.status}</span>
            </div>
            <div className="flex">
              <span className="text-gray-500 dark:text-gray-400 w-24">Time active:</span>
              <span className="font-bold text-gray-800 dark:text-white">{incidentData.timeActive}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Awareness Timeline */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-socius-red mb-4">Awareness Timeline</h2>
        <div className="space-y-0">
          {incidentData.timeline.map((item, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start border-b border-gray-100 dark:border-gray-700 last:border-0 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex-shrink-0 mr-4 mt-1.5">
                <div className={`h-3 w-3 rounded-full border-2 ${item.type === 'alert' ? 'bg-orange-500 border-orange-500' : 'bg-white border-gray-300 dark:bg-gray-700 dark:border-gray-500'}`}></div>
              </div>
              <div className="flex-1 flex items-center">
                <span className="text-sm font-bold text-gray-800 dark:text-white w-24">{item.time}</span>
                <span className="text-gray-300 dark:text-gray-600 mx-3">|</span>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {item.event.includes('Flag raised:') ? (
                    <>
                      Flag raised: <span className="text-red-600 font-bold">{item.event.split('Flag raised: ')[1]}</span>
                    </>
                  ) : (
                    item.event
                  )}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Participation Overview */}
        <Card className="flex flex-col p-0 overflow-hidden">
          <div className="p-6 flex-1">
            <h2 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">Participation Overview</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-4xl font-bold text-gray-800 dark:text-white mb-2">{incidentData.stats.usersViewed}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight">Users who viewed awareness</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-gray-800 dark:text-white mb-2">{incidentData.stats.volunteersOpened}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight">Volunteers who opened details</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-gray-800 dark:text-white mb-2">{incidentData.stats.volunteersNearby}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight">Volunteers marked "nearby"</div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-3 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              Participation is voluntary and self-reported.
            </p>
          </div>
        </Card>

        {/* Safety Flags */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-socius-red mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">Safety Flags</h2>
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md p-4 flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="text-sm font-bold text-gray-800 dark:text-white">{incidentData.flag.type}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Flag Source: {incidentData.flag.source}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Admin Actions */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">Admin Actions</h2>
        <div className="flex flex-wrap gap-4 mb-6">
          <Button 
            variant="primary" 
            className="bg-blue-700 hover:bg-blue-800 border-transparent" 
            onClick={handleFreeze}
            loading={processingAction === 'freeze'}
            disabled={processingAction !== null}
          >
            Freeze Awareness
          </Button>
          <Button 
            variant="secondary" 
            className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white" 
            onClick={handleMerge}
            loading={processingAction === 'merge'}
            disabled={processingAction !== null}
          >
            Merge with Another Awareness
          </Button>
          <Button 
            variant="secondary" 
            className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white" 
            onClick={handleClose}
            loading={processingAction === 'close'}
            disabled={processingAction !== null}
          >
            Close Awareness
          </Button>
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
           <p className="text-sm italic text-gray-500 dark:text-gray-400">
             This platform provides awareness visibility only. No actions taken by users or volunteers are directed or coordinated by Socius.
           </p>
        </div>
      </Card>

      {/* Footer System Log */}
      <div className="pt-2">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Internal system view — access logged
        </p>
      </div>
    </div>
  );
};

export default LiveAwarenessDetailsPage;