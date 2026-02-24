import React, { useState } from 'react';
import { Product, Feature } from '../../types';
import { ArrowLeft, Plus, X, Search, FileText, Settings, Edit3, Trash2, Figma, Image as ImageIcon, PenTool, Loader2, Upload } from 'lucide-react';
import { formatDate } from '../../lib/utils';

interface FeaturesPageProps {
    product: Product;
    features: Feature[];
    onBack: () => void;
    onCreateFeature: (feature: Feature) => void;
    onEditFeature: (feature: Feature) => void;
    onDeleteFeature: (featureId: string) => void;
    onUploadImage?: (file: File) => Promise<string>;
}

export const FeaturesPage: React.FC<FeaturesPageProps> = ({
    product,
    features,
    onBack,
    onCreateFeature,
    onEditFeature,
    onDeleteFeature,
    onUploadImage
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
    const [viewingFeature, setViewingFeature] = useState<Feature | null>(null);
    const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Feature Form
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [srsLink, setSrsLink] = useState('');
    const [designReferenceLink, setDesignReferenceLink] = useState('');
    const [designReferenceImageUrls, setDesignReferenceImageUrls] = useState<string[]>([]);

    const openCreateModal = () => {
        setEditingFeature(null);
        setName('');
        setDescription('');
        setSrsLink('');
        setDesignReferenceLink('');
        setDesignReferenceImageUrls([]);
        setIsModalOpen(true);
    };

    const openEditModal = (feature: Feature) => {
        setEditingFeature(feature);
        setName(feature.name);
        setDescription(feature.description || '');
        setSrsLink(feature.srsLink || '');
        setDesignReferenceLink(feature.designReferenceLink || '');
        setDesignReferenceImageUrls(feature.designReferenceImageUrls || []);
        setIsModalOpen(true);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !onUploadImage) return;

        setIsUploading(true);
        try {
            const file = e.target.files[0];
            const url = await onUploadImage(file);
            setDesignReferenceImageUrls(prev => [...prev, url]);
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Failed to upload image. Please try again.');
        } finally {
            setIsUploading(false);
            e.target.value = ''; // Reset input
        }
    };

    const removeImage = (indexToRemove: number) => {
        setDesignReferenceImageUrls(prev => prev.filter((_, idx) => idx !== indexToRemove));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        if (editingFeature) {
            onEditFeature({
                ...editingFeature,
                name,
                description,
                srsLink,
                designReferenceLink,
                designReferenceImageUrls
            });
        } else {
            onCreateFeature({
                id: `FEAT-${Date.now()}`,
                productId: product.id,
                name,
                description,
                srsLink,
                designReferenceLink,
                designReferenceImageUrls
            });
        }

        setIsModalOpen(false);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">

            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={onBack}
                    className="flex items-center text-sm font-medium text-gray-500 hover:text-violet-600 transition-colors mb-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to Products
                </button>
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{product.name} Features</h1>
                        <p className="text-gray-500 mt-2 max-w-2xl">{product.description || 'Manage features and modules for this product.'}</p>
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl shadow-md transition-all font-medium"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Add Module / Feature</span>
                    </button>
                </div>
            </div>

            {/* Features List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {features.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center">
                        <div className="bg-gray-50 p-4 rounded-full mb-4">
                            <Settings className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">No Features Found</h3>
                        <p className="text-gray-500 mb-6">Add modules or features to build out your product structure.</p>
                        <button
                            onClick={openCreateModal}
                            className="px-4 py-2 rounded-xl text-violet-700 bg-violet-100 hover:bg-violet-200 font-medium transition-colors"
                        >
                            Add First Feature
                        </button>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Feature / Module</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Resources</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {features.map((feature) => (
                                <tr key={feature.id} onClick={() => setViewingFeature(feature)} className="hover:bg-gray-50 transition-colors cursor-pointer">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-gray-900">{feature.name}</div>
                                        <div className="text-xs text-gray-400 font-mono mt-1">{feature.id}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-600 max-w-md line-clamp-2">
                                            {feature.description || <span className="text-gray-400 italic">No description</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col gap-2 items-start">
                                            {feature.srsLink && (
                                                <a href={feature.srsLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline bg-blue-50 px-2 py-1 rounded-lg">
                                                    <FileText className="w-3.5 h-3.5" />
                                                    <span>SRS Doc</span>
                                                </a>
                                            )}
                                            {feature.designReferenceLink && (
                                                <a href={feature.designReferenceLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center space-x-1 text-sm text-pink-600 hover:text-pink-800 font-medium hover:underline bg-pink-50 px-2 py-1 rounded-lg">
                                                    <Figma className="w-3.5 h-3.5" />
                                                    <span>Figma Link</span>
                                                </a>
                                            )}
                                            {feature.designReferenceImageUrls && feature.designReferenceImageUrls.length > 0 && (
                                                <div className="flex items-center space-x-1 text-sm text-teal-600 font-medium bg-teal-50 px-2 py-1 rounded-lg">
                                                    <ImageIcon className="w-3.5 h-3.5" />
                                                    <span>{feature.designReferenceImageUrls.length} Image(s)</span>
                                                </div>
                                            )}
                                            {!feature.srsLink && !feature.designReferenceLink && (!feature.designReferenceImageUrls || feature.designReferenceImageUrls.length === 0) && (
                                                <span className="text-xs text-gray-400 italic">No resources</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openEditModal(feature);
                                            }}
                                            className="text-violet-600 hover:text-violet-900 mr-4"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm('Delete this feature? This cannot be undone.')) {
                                                    onDeleteFeature(feature.id);
                                                }
                                            }}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Provide the modals at the bottom */}
            {/* Feature Overview Modal */}
            {viewingFeature && !editingFeature && !isModalOpen && (
                <div className="fixed inset-0 z-40 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setViewingFeature(null)}></div>
                        <div className="inline-block w-full max-w-2xl my-8 text-left align-middle transition-all transform bg-white rounded-2xl shadow-xl">
                            <div className="bg-white px-6 pt-5 pb-6 rounded-2xl">
                                <div className="flex justify-between items-start mb-5 pb-4 border-b border-gray-100">
                                    <div>
                                        <h3 className="text-2xl font-bold text-gray-900">{viewingFeature.name}</h3>
                                        <div className="text-sm text-gray-400 font-mono mt-1">{viewingFeature.id}</div>
                                    </div>
                                    <button onClick={() => setViewingFeature(null)} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors">
                                        <X className="w-5 h-5 text-gray-500" />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wider">Description</h4>
                                        <div className="text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-100 whitespace-pre-wrap min-h-[80px]">
                                            {viewingFeature.description || <span className="text-gray-400 italic">No description provided.</span>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider flex items-center">
                                                <FileText className="w-4 h-4 mr-2 text-blue-500" /> Resources
                                            </h4>
                                            {viewingFeature.srsLink ? (
                                                <a href={viewingFeature.srsLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-full space-x-2 text-sm text-blue-700 hover:text-blue-800 font-medium bg-blue-50 hover:bg-blue-100 px-4 py-3 rounded-xl transition-colors border border-blue-100">
                                                    <FileText className="w-4 h-4" />
                                                    <span>Open SRS Document</span>
                                                </a>
                                            ) : (
                                                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100 text-center italic">No SRS Document linked</div>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider flex items-center">
                                                <Figma className="w-4 h-4 mr-2 text-pink-500" /> Design Reference
                                            </h4>
                                            {viewingFeature.designReferenceLink ? (
                                                <a href={viewingFeature.designReferenceLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-full space-x-2 text-sm text-pink-700 hover:text-pink-800 font-medium bg-pink-50 hover:bg-pink-100 px-4 py-3 rounded-xl transition-colors border border-pink-100">
                                                    <Figma className="w-4 h-4" />
                                                    <span>Open Figma Design</span>
                                                </a>
                                            ) : (
                                                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100 text-center italic">No Figma link provided</div>
                                            )}
                                        </div>
                                    </div>

                                    {viewingFeature.designReferenceImageUrls && viewingFeature.designReferenceImageUrls.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider flex items-center">
                                                <ImageIcon className="w-4 h-4 mr-2 text-teal-500" /> Screenshots
                                            </h4>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                                {viewingFeature.designReferenceImageUrls.map((url, idx) => (
                                                    <div
                                                        key={idx}
                                                        onClick={() => setFullScreenImage(url)}
                                                        className="relative rounded-xl overflow-hidden border border-gray-200 aspect-video bg-gray-100 cursor-pointer group shadow-sm hover:shadow-md transition-all hover:ring-2 hover:ring-violet-400"
                                                    >
                                                        <img src={url} alt={`Screenshot ${idx + 1}`} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                            <div className="bg-white/90 text-gray-900 text-xs font-bold px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all">
                                                                View Full
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setIsModalOpen(false)}></div>
                        <div className="inline-block w-full max-w-lg my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-2xl shadow-xl">
                            <div className="bg-white px-6 pt-5 pb-6 border-b border-gray-100">
                                <div className="flex justify-between items-center mb-5">
                                    <h3 className="text-xl font-bold text-gray-900">{editingFeature ? 'Edit Feature' : 'Add New Feature'}</h3>
                                    <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Feature / Module Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="block w-full border border-gray-300 rounded-xl shadow-sm p-2.5 focus:ring-violet-500 focus:border-violet-500 sm:text-sm"
                                            placeholder="e.g. Reporting Dashboard, User Auth"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            rows={4}
                                            className="block w-full border border-gray-300 rounded-xl shadow-sm p-2.5 focus:ring-violet-500 focus:border-violet-500 sm:text-sm"
                                            placeholder="Describe what this module does..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">SRS Document Link (Optional)</label>
                                        <input
                                            type="url"
                                            value={srsLink}
                                            onChange={(e) => setSrsLink(e.target.value)}
                                            className="block w-full border border-gray-300 rounded-xl shadow-sm p-2.5 focus:ring-violet-500 focus:border-violet-500 sm:text-sm"
                                            placeholder="https://..."
                                        />
                                    </div>

                                    <div className="pt-4 border-t border-gray-100">
                                        <h4 className="text-sm font-bold text-gray-900 flex items-center mb-3">
                                            <PenTool className="w-4 h-4 mr-2 text-violet-600" />
                                            Design References
                                        </h4>
                                        <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Figma Link</label>
                                                <div className="relative">
                                                    <Figma className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input
                                                        type="url"
                                                        value={designReferenceLink}
                                                        onChange={(e) => setDesignReferenceLink(e.target.value)}
                                                        className="block w-full pl-9 border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-violet-500 focus:border-violet-500 sm:text-sm"
                                                        placeholder="https://www.figma.com/file/..."
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Screenshot Images</label>

                                                {/* Uploaded Images Preview */}
                                                {designReferenceImageUrls.length > 0 && (
                                                    <div className="grid grid-cols-3 gap-3 mb-3">
                                                        {designReferenceImageUrls.map((url, idx) => (
                                                            <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-video bg-gray-100">
                                                                <img src={url} alt="Design reference" className="w-full h-full object-cover" />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeImage(idx)}
                                                                    className="absolute top-1 right-1 bg-white/90 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-500"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Upload Button */}
                                                {onUploadImage && (
                                                    <div className="relative">
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={handleFileChange}
                                                            disabled={isUploading}
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                                        />
                                                        <div className={`flex items-center justify-center space-x-2 border-2 border-dashed rounded-lg p-4 text-sm font-medium transition-colors ${isUploading ? 'border-violet-300 bg-violet-50 text-violet-500' : 'border-gray-300 hover:border-violet-400 text-gray-600 hover:text-violet-600 hover:bg-violet-50/50'}`}>
                                                            {isUploading ? (
                                                                <>
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                    <span>Uploading...</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Upload className="w-4 h-4" />
                                                                    <span>Upload File or Drop Here</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                                {!onUploadImage && (
                                                    <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded-lg border border-orange-100">
                                                        Storage is not configured. Uploads unavailable.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-5 mt-2 border-t border-gray-100 flex justify-end space-x-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsModalOpen(false)}
                                            className="px-5 py-2.5 rounded-xl text-gray-700 bg-gray-100 hover:bg-gray-200 font-medium transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-5 py-2.5 rounded-xl text-white bg-violet-600 hover:bg-violet-700 font-medium shadow-md transition-all"
                                        >
                                            {editingFeature ? 'Save Changes' : 'Create Feature'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Full Screen Image Modal */}
            {fullScreenImage && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 sm:p-8 animate-in fade-in duration-200">
                    <button
                        onClick={() => setFullScreenImage(null)}
                        className="absolute top-4 right-4 sm:top-6 sm:right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all z-10"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <img
                        src={fullScreenImage}
                        alt="Full screen design reference"
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                    />
                </div>
            )}
        </div>
    );
};
