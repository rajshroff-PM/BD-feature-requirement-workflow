import React, { useState } from 'react';
import { Product, Feature } from '../../types';
import { Package, Plus, X, ChevronRight, LayoutGrid, Edit3, Trash2, AlertTriangle, RotateCcw, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FeaturesPage } from './FeaturesPage';

interface ProductsPageProps {
    products: Product[];
    features: Feature[];
    onCreateProduct: (product: Product) => void;
    onEditProduct: (product: Product) => void;
    onCreateFeature: (feature: Feature) => void;
    onEditFeature: (feature: Feature) => void;
    onDeleteFeature: (featureId: string) => void;
    onUploadImage?: (file: File) => Promise<string>;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({
    products,
    features,
    onCreateProduct,
    onEditProduct,
    onCreateFeature,
    onEditFeature,
    onDeleteFeature,
    onUploadImage
}) => {
    const navigate = useNavigate();
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [recallingProduct, setRecallingProduct] = useState<Product | null>(null);

    // New/Edit Product Form
    const [productName, setProductName] = useState('');
    const [productIcon, setProductIcon] = useState('Box');
    const [productDescription, setProductDescription] = useState('');

    const handleOpenCreateModal = () => {
        setEditingProduct(null);
        setProductName('');
        setProductIcon('Box');
        setProductDescription('');
        setIsCreateModalOpen(true);
    };

    const handleOpenEditModal = (e: React.MouseEvent, product: Product) => {
        e.stopPropagation();
        setEditingProduct(product);
        setProductName(product.name);
        setProductIcon(product.icon || 'Box');
        setProductDescription(product.description || '');
        setIsCreateModalOpen(true);
    };

    const handleSaveProduct = (e: React.FormEvent) => {
        e.preventDefault();
        if (!productName.trim()) return;

        if (editingProduct) {
            onEditProduct({
                ...editingProduct,
                name: productName,
                icon: productIcon,
                description: productDescription
            });
        } else {
            onCreateProduct({
                id: `PROD-${Date.now()}`,
                name: productName,
                icon: productIcon,
                description: productDescription
            });
        }

        setIsCreateModalOpen(false);
        setEditingProduct(null);
    };

    const handleDeleteClick = () => {
        // Hide edit modal, show delete confirm modal
        setIsCreateModalOpen(false);
        setIsDeleteConfirmOpen(true);
    };

    const confirmDeleteProduct = () => {
        if (!editingProduct) return;

        // Soft delete: set pendingDeletionAt to 24 hours from now
        const deletionTime = new Date();
        deletionTime.setHours(deletionTime.getHours() + 24);

        onEditProduct({
            ...editingProduct,
            pendingDeletionAt: deletionTime.toISOString()
        });

        setIsDeleteConfirmOpen(false);
        setEditingProduct(null);
    };

    const handleProductClick = (product: Product) => {
        if (product.pendingDeletionAt) {
            setRecallingProduct(product);
        } else {
            setSelectedProductId(product.id);
        }
    };

    const confirmRecallProduct = () => {
        if (!recallingProduct) return;

        onEditProduct({
            ...recallingProduct,
            pendingDeletionAt: undefined
        });

        setRecallingProduct(null);
    };

    if (selectedProductId) {
        const product = products.find(p => p.id === selectedProductId);
        if (!product) {
            setSelectedProductId(null);
            return null;
        }
        return (
            <FeaturesPage
                product={product}
                features={features.filter(f => f.productId === product.id)}
                onBack={() => setSelectedProductId(null)}
                onCreateFeature={onCreateFeature}
                onEditFeature={onEditFeature}
                onDeleteFeature={onDeleteFeature}
                onUploadImage={onUploadImage}
            />
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
            <div className="mb-8">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-sm font-medium text-gray-500 hover:text-violet-600 transition-colors mb-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </button>
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                            <LayoutGrid className="w-6 h-6 mr-3 text-violet-600" />
                            Products Portfolio
                        </h1>
                        <p className="text-gray-500 mt-1">Manage software products and their features.</p>
                    </div>
                    <button
                        onClick={handleOpenCreateModal}
                        className="flex items-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-2xl shadow-md transition-all"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Add Product</span>
                    </button>
                </div>
            </div>

            {products.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md border border-dashed border-gray-300 p-12 text-center flex flex-col items-center">
                    <div className="bg-violet-50 p-4 rounded-full mb-4">
                        <Package className="w-8 h-8 text-violet-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">No Products Yet</h3>
                    <p className="text-gray-500 max-w-sm mb-6">Create your first product (e.g. Mobile App, Kiosk) to start managing its features.</p>
                    <button
                        onClick={handleOpenCreateModal}
                        className="flex items-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-2xl shadow-md transition-all"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Create First Product</span>
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map(product => {
                        const isPendingDeletion = !!product.pendingDeletionAt;

                        return (
                            <div
                                key={product.id}
                                onClick={() => handleProductClick(product)}
                                className={`rounded-xl border p-5 cursor-pointer transition-all group relative overflow-hidden ${isPendingDeletion
                                    ? 'bg-gray-50 border-gray-200 opacity-60 hover:opacity-100 grayscale'
                                    : 'bg-white shadow-sm border-gray-200 hover:shadow-md hover:border-violet-300'
                                    }`}
                            >
                                {isPendingDeletion && (
                                    <div className="absolute top-0 right-0 left-0 bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider text-center py-1">
                                        Pending Deletion
                                    </div>
                                )}
                                <div className={`flex justify-between items-start mb-4 ${isPendingDeletion ? 'mt-4' : ''}`}>
                                    <div className={`p-3 rounded-xl transition-colors ${isPendingDeletion
                                        ? 'bg-gray-200 text-gray-500'
                                        : 'bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white'
                                        }`}>
                                        <Package className="w-6 h-6" />
                                    </div>
                                    <div className="flex space-x-2">
                                        {!isPendingDeletion && (
                                            <button
                                                onClick={(e) => handleOpenEditModal(e, product)}
                                                className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                        )}
                                        <ChevronRight className={`w-5 h-5 transition-colors mt-1 ${isPendingDeletion ? 'text-gray-400' : 'text-gray-300 group-hover:text-violet-500'}`} />
                                    </div>
                                </div>
                                <h3 className={`text-lg font-bold mb-1 ${isPendingDeletion ? 'text-gray-600' : 'text-gray-900'}`}>{product.name}</h3>
                                <p className="text-sm text-gray-500 line-clamp-2 h-10">{product.description || 'No description provided.'}</p>

                                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-xs font-medium text-gray-500">
                                    <span>{features.filter(f => f.productId === product.id).length} Features</span>
                                    <span className={`${isPendingDeletion ? 'text-gray-500' : 'text-violet-600 opacity-0 group-hover:opacity-100'} transition-opacity`}>
                                        {isPendingDeletion ? 'Click to Recall' : 'Manage Features'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setIsCreateModalOpen(false)}></div>
                        <div className="inline-block w-full max-w-md my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-2xl shadow-xl">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-100">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-gray-900">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
                                    <button onClick={() => setIsCreateModalOpen(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
                                </div>

                                <form onSubmit={handleSaveProduct} className="space-y-4 pt-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Product Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={productName}
                                            onChange={(e) => setProductName(e.target.value)}
                                            className="mt-1 block w-full border border-gray-300 rounded-xl shadow-sm p-2 focus:ring-violet-500 focus:border-violet-500"
                                            placeholder="e.g. Mobile App, Kiosk"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Description</label>
                                        <textarea
                                            value={productDescription}
                                            onChange={(e) => setProductDescription(e.target.value)}
                                            rows={3}
                                            className="mt-1 block w-full border border-gray-300 rounded-xl shadow-sm p-2 focus:ring-violet-500 focus:border-violet-500"
                                            placeholder="Brief description of the product..."
                                        />
                                    </div>
                                    <div className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center space-y-3 space-y-reverse sm:space-y-0">
                                        {editingProduct ? (
                                            <button
                                                type="button"
                                                onClick={handleDeleteClick}
                                                className="text-red-500 hover:text-red-700 font-medium text-sm flex items-center"
                                            >
                                                <Trash2 className="w-4 h-4 mr-1" />
                                                Delete Product
                                            </button>
                                        ) : (
                                            <div></div> // spacer
                                        )}
                                        <div className="flex space-x-3 w-full sm:w-auto justify-end">
                                            <button
                                                type="button"
                                                onClick={() => setIsCreateModalOpen(false)}
                                                className="px-4 py-2 rounded-xl text-gray-700 bg-gray-100 hover:bg-gray-200 font-medium transition-colors w-full sm:w-auto"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="px-4 py-2 rounded-xl text-white bg-violet-600 hover:bg-violet-700 font-medium shadow-md transition-colors w-full sm:w-auto"
                                            >
                                                {editingProduct ? 'Save Changes' : 'Create Product'}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteConfirmOpen && editingProduct && (
                <div className="fixed inset-0 z-[60] overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setIsDeleteConfirmOpen(false)}></div>
                        <div className="inline-block w-full max-w-sm my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-2xl shadow-xl">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-100">
                                <div className="sm:flex sm:items-start">
                                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                        <AlertTriangle className="h-6 w-6 text-red-600" />
                                    </div>
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                        <h3 className="text-lg leading-6 font-bold text-gray-900">Delete Product</h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500 leading-relaxed">
                                                Are you sure you want to delete <span className="font-bold text-gray-900">{editingProduct.name}</span>?
                                                Deleting this product will impact BD requirement fields as well.
                                            </p>
                                            <div className="mt-3 bg-amber-50 rounded-lg p-3 border border-amber-200">
                                                <p className="text-xs text-amber-800 font-medium">
                                                    Note: The product will be in a "Pending Deletion" state for 24 hours, during which you can recall this action. After 24 hours, it will be permanently deleted.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse border-t border-gray-100 pt-4">
                                    <button
                                        type="button"
                                        className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                                        onClick={confirmDeleteProduct}
                                    >
                                        Confirm Delete
                                    </button>
                                    <button
                                        type="button"
                                        className="mt-3 w-full inline-flex justify-center rounded-xl border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 sm:mt-0 sm:w-auto sm:text-sm"
                                        onClick={() => setIsDeleteConfirmOpen(false)}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Recall Deletion Modal */}
            {recallingProduct && (
                <div className="fixed inset-0 z-[60] overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setRecallingProduct(null)}></div>
                        <div className="inline-block w-full max-w-sm my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-2xl shadow-xl">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-100">
                                <div className="sm:flex sm:items-start">
                                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                                        <RotateCcw className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                        <h3 className="text-lg leading-6 font-bold text-gray-900">Recall Deletion</h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500">
                                                Do you want to restore <span className="font-bold text-gray-900">{recallingProduct.name}</span>? This will cancel the pending deletion and make the product active again.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse border-t border-gray-100 pt-4">
                                    <button
                                        type="button"
                                        className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                                        onClick={confirmRecallProduct}
                                    >
                                        Recall & Restore
                                    </button>
                                    <button
                                        type="button"
                                        className="mt-3 w-full inline-flex justify-center rounded-xl border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 sm:mt-0 sm:w-auto sm:text-sm"
                                        onClick={() => setRecallingProduct(null)}
                                    >
                                        Keep Pending
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
