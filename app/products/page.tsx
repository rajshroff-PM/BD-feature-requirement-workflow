'use client';

import React from 'react';
import { useGlobal } from '../providers';
import { ProductsPage } from '../../components/products/ProductsPage';
import { redirect } from 'next/navigation';

export default function ProductsPageRoute() {
  const { 
    user, products, features, 
    handleCreateProduct, handleEditProduct, 
    handleCreateFeature, handleEditFeature, 
    handleDeleteFeature, handleUploadImage 
  } = useGlobal();

  if (user && !user.permissions?.view_products) {
    redirect('/');
  }

  return (
    <ProductsPage
      products={products}
      features={features}
      onCreateProduct={handleCreateProduct}
      onEditProduct={handleEditProduct}
      onCreateFeature={handleCreateFeature}
      onEditFeature={handleEditFeature}
      onDeleteFeature={handleDeleteFeature}
      onUploadImage={handleUploadImage}
    />
  );
}
