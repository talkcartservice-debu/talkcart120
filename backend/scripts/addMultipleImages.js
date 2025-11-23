// Script to add multiple images to a product for testing image rotation
const mongoose = require('mongoose');
const Product = require('../models/Product');

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/talkcart', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const addMultipleImages = async () => {
  try {
    // Find a product to update
    const product = await Product.findOne();
    
    if (!product) {
      console.log('No products found');
      return;
    }
    
    // Add multiple images to the product
    const additionalImages = [
      {
        public_id: 'test/image1',
        secure_url: 'https://picsum.photos/300/200?random=1',
        url: 'https://picsum.photos/300/200?random=1'
      },
      {
        public_id: 'test/image2',
        secure_url: 'https://picsum.photos/300/200?random=2',
        url: 'https://picsum.photos/300/200?random=2'
      },
      {
        public_id: 'test/image3',
        secure_url: 'https://picsum.photos/300/200?random=3',
        url: 'https://picsum.photos/300/200?random=3'
      }
    ];
    
    // Update the product with multiple images
    product.images = [...product.images, ...additionalImages];
    
    await product.save();
    
    console.log('Successfully added multiple images to product:', product.name);
    console.log('Product now has', product.images.length, 'images');
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error adding multiple images:', error);
    mongoose.connection.close();
  }
};

addMultipleImages();