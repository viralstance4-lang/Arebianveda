const Category = require('../models/Category');
const Product = require('../models/Product');
const slugify = require('../utils/slugify');

// GET /api/categories — public, only published
exports.getPublishedCategories = async (req, res) => {
  const categories = await Category.find({ status: 'published' }).sort({ order: 1, name: 1 });
  res.json({ success: true, categories });
};

// GET /api/categories/admin — admin, all
exports.getAllCategories = async (req, res) => {
  const categories = await Category.find().sort({ order: 1, name: 1 });
  res.json({ success: true, categories });
};

// POST /api/categories — admin
exports.createCategory = async (req, res) => {
  const { name, description, emoji, color, imageUrl, status, order } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ success: false, message: 'Category name is required' });
  }
  // Check duplicate slug
  const slug = slugify(name);
  const existing = await Category.findOne({ slug });
  if (existing) {
    return res.status(400).json({ success: false, message: `A category with this name already exists (slug: ${slug})` });
  }
  const category = await Category.create({ name, description, emoji, color, imageUrl, status, order });
  res.status(201).json({ success: true, category });
};

// PUT /api/categories/:id — admin
exports.updateCategory = async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

  const oldSlug = category.slug;
  Object.assign(category, req.body);
  await category.save(); // triggers pre-save slug regeneration

  // If slug changed, update all products that referenced the old slug
  if (category.slug !== oldSlug) {
    await Product.updateMany(
      { categories: oldSlug },
      { $set: { 'categories.$[elem]': category.slug } },
      { arrayFilters: [{ elem: oldSlug }] }
    );
  }

  res.json({ success: true, category });
};

// DELETE /api/categories/:id — admin
// If products still reference this category's slug, the caller must specify
// how to handle them via req.body.action: 'reassign' (move to targetSlug) or
// 'unassign' (set to 'uncategorized'). Without an action, returns 409 so the
// admin can choose — this prevents orphaned product.categories references.
exports.deleteCategory = async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

  const { action, targetSlug } = req.body;
  const productCount = await Product.countDocuments({ categories: category.slug });

  if (productCount > 0) {
    if (action === 'reassign') {
      if (!targetSlug || targetSlug === category.slug) {
        return res.status(400).json({ success: false, message: 'A different target category is required to reassign products' });
      }
      const target = await Category.findOne({ slug: targetSlug });
      if (!target) return res.status(404).json({ success: false, message: 'Target category not found' });
      await Product.updateMany(
        { categories: category.slug },
        { $set: { 'categories.$[c]': targetSlug, 'categoryIds.$[i]': target._id } },
        { arrayFilters: [{ c: category.slug }, { i: category._id }] }
      );
    } else if (action === 'unassign') {
      await Product.updateMany(
        { categories: category.slug },
        { $pull: { categories: category.slug, categoryIds: category._id } }
      );
    } else {
      return res.status(409).json({
        success: false,
        requiresAction: true,
        message: `This category is assigned to ${productCount} product${productCount === 1 ? '' : 's'}.`,
        productCount,
        categoryName: category.name,
        categorySlug: category.slug,
      });
    }
  }

  await category.deleteOne();
  res.json({ success: true, message: 'Category deleted', productsUpdated: productCount });
};

// POST /api/categories/migrate — admin only
// Fixes all existing categories: regenerates slugs & syncs product category fields
exports.migrateCategories = async (req, res) => {
  const categories = await Category.find();
  const results = [];

  for (const cat of categories) {
    const correctSlug = slugify(cat.name);
    const oldSlug = cat.slug;

    if (oldSlug !== correctSlug) {
      cat.slug = correctSlug;
      await cat.save({ validateBeforeSave: false });

      // Update all products that had the old (wrong) slug
      const updated = await Product.updateMany(
        { categories: oldSlug },
        { $set: { 'categories.$[elem]': correctSlug } },
        { arrayFilters: [{ elem: oldSlug }] }
      );
      results.push({ name: cat.name, oldSlug, newSlug: correctSlug, productsFixed: updated.modifiedCount });
    } else {
      // Slug is already correct — still sync products that used the raw name
      const rawName = cat.name.toLowerCase();
      if (rawName !== correctSlug) {
        const updated = await Product.updateMany(
          { categories: rawName },
          { $set: { 'categories.$[elem]': correctSlug } },
          { arrayFilters: [{ elem: rawName }] }
        );
        if (updated.modifiedCount > 0) {
          results.push({ name: cat.name, oldSlug: rawName, newSlug: correctSlug, productsFixed: updated.modifiedCount });
        }
      }
    }
  }

  res.json({ success: true, message: 'Migration complete', results });
};
