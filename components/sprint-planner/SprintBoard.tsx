import React, { useState, useRef } from 'react';
import { Task, TicketType } from '../../types';
import { User, CheckCircle2, ArrowUp, ArrowDown, Minus, Calendar } from 'lucide-react';
import { TicketTypeBadge } from '../TicketTypeBadge';
import { Badge } from '../Badge';
import { formatHoursToTime, formatDate } from '../../lib/utils';

interface SprintBoardProps {
    tasks: Task[];
    allTasks: Task[];
    onEditTask: (task: Task) => void;
    onTaskClick: (task: Task) => void;
}

const COLUMNS: { id: Task['status']; title: string; headerColor: string; dotColor: string }[] = [
    { id: 'To Do', title: 'To Do', headerColor: 'text-gray-700 border-gray-300', dotColor: 'bg-gray-400' },
    { id: 'In Progress', title: 'In Progress', headerColor: 'text-blue-700 border-blue-400', dotColor: 'bg-blue-500' },
    { id: 'Code Review', title: 'In Review', headerColor: 'text-purple-700 border-purple-400', dotColor: 'bg-purple-500' },
    { id: 'QA', title: 'QA', headerColor: 'text-amber-700 border-amber-400', dotColor: 'bg-amber-500' },
    { id: 'Done', title: 'Done', headerColor: 'text-emerald-700 border-emerald-400', dotColor: 'bg-emerald-500' },
];

export const SprintBoard: React.FC<SprintBoardProps> = ({ tasks, allTasks, onEditTask, onTaskClick }) => {
    const [isDragging, setIsDragging] = useState(false);
    const draggedTaskIdRef = useRef<string | null>(null);

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData('text/plain', taskId);
        draggedTaskIdRef.current = taskId;
        setIsDragging(true);
        // Required for Firefox
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        draggedTaskIdRef.current = null;
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, newStatus: Task['status']) => {
        e.preventDefault();
        e.stopPropagation();
        const taskId = e.dataTransfer.getData('text/plain') || draggedTaskIdRef.current;
        
        if (!taskId) {
            console.error('Drag and drop failed: No taskId found.');
            return;
        }

        const task = tasks.find(t => t.id === taskId) || allTasks.find(t => t.id === taskId);
        
        if (task && task.status !== newStatus) {
            onEditTask({ ...task, status: newStatus });
        }
        draggedTaskIdRef.current = null;
        setIsDragging(false);
    };

    return (
        <div className="flex gap-5 overflow-x-auto pb-6 pt-2 items-start min-h-[600px] px-1">
            {COLUMNS.map(column => {
                const columnTasks = tasks.filter(t => t.status === column.id);
                
                return (
                    <div 
                        key={column.id}
                        className={`flex-shrink-0 w-80 flex flex-col transition-all rounded-2xl bg-gray-50/80 border border-gray-200 shadow-sm ${isDragging ? 'opacity-80' : ''}`}
                        onDragOver={handleDragOver}
                        onDragEnter={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, column.id)}
                    >
                        {/* Column Header */}
                        <div className={`px-4 py-3.5 border-b-2 flex justify-between items-center bg-white/60 backdrop-blur-sm rounded-t-2xl ${column.headerColor}`}>
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${column.dotColor}`}></span>
                                <h3 className="font-bold text-xs uppercase tracking-wider">
                                    {column.title}
                                </h3>
                            </div>
                            <span className="bg-gray-100/80 text-gray-600 text-xs font-bold px-2.5 py-0.5 rounded-full border border-gray-200">
                                {columnTasks.length}
                            </span>
                        </div>

                        {/* Task Cards Container */}
                        <div className="p-3 flex flex-col gap-3 flex-1 min-h-[150px]">
                            {columnTasks.map(task => {
                                const parentEpic = task.parentId ? allTasks.find(t => t.id === task.parentId && t.ticketType === 'Epic') : null;
                                
                                return (
                                    <div
                                        key={task.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, task.id)}
                                        onDragEnd={handleDragEnd}
                                        onClick={() => onTaskClick(task)}
                                        className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-violet-300 transition-all ${draggedTaskIdRef.current === task.id ? 'opacity-50 ring-2 ring-violet-400 border-transparent' : ''}`}
                                    >
                                        <div className="flex justify-between items-start mb-3 gap-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <TicketTypeBadge type={task.ticketType || 'Task'} />
                                                {parentEpic && (
                                                    <span className="text-[10px] font-bold tracking-wider text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded uppercase max-w-[120px] truncate border border-violet-100" title={parentEpic.title}>
                                                        {parentEpic.title}
                                                    </span>
                                                )}
                                            </div>
                                            {task.storyPoints != null && (
                                                <span className="text-[11px] font-semibold bg-gray-50 border border-gray-100 text-gray-600 px-1.5 py-0.5 rounded shrink-0">
                                                    {task.storyPoints} pt
                                                </span>
                                            )}
                                        </div>
                                        
                                        <h4 className="text-sm font-semibold text-gray-900 mb-3 leading-snug line-clamp-3 hover:line-clamp-none transition-all" title={task.title}>
                                            {task.title}
                                        </h4>
                                        
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {task.priority && (
                                                <span className="flex items-center text-[10px] bg-white border border-gray-200 text-gray-600 px-1.5 py-0.5 rounded-md font-medium shadow-sm" title={`Priority: ${task.priority}`}>
                                                    {task.priority === 'Highest' && <ArrowUp className="w-3 h-3 text-red-600 mr-0.5" />}
                                                    {task.priority === 'High' && <ArrowUp className="w-3 h-3 text-orange-500 mr-0.5" />}
                                                    {task.priority === 'Medium' && <Minus className="w-3 h-3 text-yellow-500 mr-0.5" />}
                                                    {(task.priority === 'Low' || task.priority === 'Lowest') && <ArrowDown className="w-3 h-3 text-green-500 mr-0.5" />}
                                                    {task.priority}
                                                </span>
                                            )}
                                            {task.dueDate && (
                                                <span className={`flex items-center text-[10px] px-1.5 py-0.5 rounded-md font-medium border shadow-sm ${new Date(task.dueDate) < new Date() && task.status !== 'Done' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-white border-gray-200 text-gray-600'}`}>
                                                    <Calendar className="w-3 h-3 mr-1" />
                                                    {formatDate(task.dueDate)}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between text-xs text-gray-500 mt-auto pt-3 border-t border-gray-100">
                                            <div className="flex items-center gap-2">
                                                {/* Assignee Avatar */}
                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-100 to-violet-200 text-violet-800 flex items-center justify-center font-bold text-[10px] border border-white shadow-sm ring-1 ring-black/5" title={`Assignee: ${task.assignee || 'Unassigned'}`}>
                                                    {task.assignee ? task.assignee.charAt(0).toUpperCase() : '?'}
                                                </div>
                                                <span className="text-[11px] font-medium text-gray-600 truncate max-w-[100px]">
                                                    {task.assignee || 'Unassigned'}
                                                </span>
                                            </div>
                                            <span className="text-[11px] font-medium text-gray-600 bg-gray-100/80 px-2 py-1 rounded-md border border-gray-200 shadow-sm">
                                                {formatHoursToTime(task.effort * 8) || '0h'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {columnTasks.length === 0 && (
                                <div className="h-full flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 py-8 mx-1">
                                    Drop tasks here
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
