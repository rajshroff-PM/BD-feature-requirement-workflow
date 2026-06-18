'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useGlobal } from '../../providers';
import { SprintDetails } from '../../../components/sprint-planner/SprintDetails';

export default function SprintDetailsPage() {
    const { 
        user, sprints, tasks, profiles, 
        handleAddTask, handleEditSprint, handleEditTask, 
        handleDeleteTask, handleDeleteSprint 
    } = useGlobal();
    const router = useRouter();
    const params = useParams();
    const sprintId = params?.id as string;

    const sprint = sprints.find(s => s.id === sprintId);
    const backlog: any[] = [];

    if (!sprint) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Sprint Not Found</h2>
                    <p className="text-gray-500 mb-6">The sprint you are looking for does not exist or has been deleted.</p>
                    <button 
                        onClick={() => router.push('/current')}
                        className="bg-violet-600 text-white px-4 py-2 rounded-lg font-medium"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <SprintDetails
            sprint={sprint}
            tasks={tasks.filter(t => t.sprintId === sprint.id)}
            allTasks={tasks}
            allSprints={sprints}
            backlog={backlog}
            profiles={profiles}
            onBack={() => router.push('/current')}
            onAddTask={handleAddTask}
            onEditSprint={handleEditSprint}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onDeleteSprint={(sprintId) => {
                handleDeleteSprint?.(sprintId);
                router.push('/current');
            }}
            currentUser={user}
            userRole={user?.role}
        />
    );
}
