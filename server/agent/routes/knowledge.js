import express from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import supabase from '../database/supabase.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Get folder tree for the current user
router.get('/folders', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const { data: folders, error } = await supabase
      .from('knowledge_folders')
      .select('*')
      .order('path');
    
    if (error) {
      console.error('Error fetching folders:', error);
      return res.status(500).json({ error: 'Failed to fetch folders' });
    }
    
    res.json({ folders });
  } catch (error) {
    console.error('Error in GET /folders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get folder with breadcrumbs
router.get('/folders/:folderId/breadcrumbs', requireAuth, async (req, res) => {
  try {
    const { folderId } = req.params;
    
    const { data: breadcrumbs, error } = await supabase
      .rpc('get_folder_breadcrumbs', { folder_id: folderId });
    
    if (error) {
      console.error('Error fetching breadcrumbs:', error);
      return res.status(500).json({ error: 'Failed to fetch breadcrumbs' });
    }
    
    res.json({ breadcrumbs });
  } catch (error) {
    console.error('Error in GET /folders/:folderId/breadcrumbs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get folder children (subfolders and files)
router.get('/folders/:folderId/children', requireAuth, async (req, res) => {
  try {
    const { folderId } = req.params;
    const includeFiles = req.query.include_files === 'true';
    
    const { data: children, error } = await supabase
      .rpc('get_folder_children', { 
        folder_id: folderId, 
        include_files: includeFiles 
      });
    
    if (error) {
      console.error('Error fetching folder children:', error);
      return res.status(500).json({ error: 'Failed to fetch folder children' });
    }
    
    res.json({ children });
  } catch (error) {
    console.error('Error in GET /folders/:folderId/children:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get files in a specific folder
router.get('/folders/:folderId/files', requireAuth, async (req, res) => {
  try {
    const { folderId } = req.params;
    
    const { data: files, error } = await supabase
      .from('knowledge_files')
      .select('*')
      .eq('folder_id', folderId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching files:', error);
      return res.status(500).json({ error: 'Failed to fetch files' });
    }
    
    res.json({ files });
  } catch (error) {
    console.error('Error in GET /folders/:folderId/files:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new folder
router.post('/folders', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, parentFolderId } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Folder name is required' });
    }
    
    // Validate folder name (no special characters that could break paths)
    if (!/^[a-zA-Z0-9가-힣\s\-_()]+$/.test(name)) {
      return res.status(400).json({ error: 'Invalid folder name' });
    }
    
    let folderData = {
      name: name.trim(),
      description: description?.trim() || null,
      owner_id: userId,
      is_system_folder: false
    };
    
    if (parentFolderId) {
      // Creating a subfolder - the trigger will handle access level inheritance
      folderData.parent_folder_id = parentFolderId;
    } else {
      // Creating a root level folder - default to personal
      folderData.access_level = 'personal';
    }
    
    const { data: folder, error } = await supabase
      .from('knowledge_folders')
      .insert(folderData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating folder:', error);
      if (error.message.includes('Maximum folder depth')) {
        return res.status(400).json({ error: 'Maximum folder depth exceeded' });
      }
      return res.status(500).json({ error: 'Failed to create folder' });
    }
    
    res.json({ folder });
  } catch (error) {
    console.error('Error in POST /folders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload files to a folder
router.post('/folders/:folderId/upload', requireAuth, upload.array('files', 10), async (req, res) => {
  try {
    const userId = req.user.id;
    const { folderId } = req.params;
    const files = req.files;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }
    
    // Get folder details
    const { data: folder, error: folderError } = await supabase
      .from('knowledge_folders')
      .select('*')
      .eq('id', folderId)
      .single();
    
    if (folderError || !folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    const uploadedFiles = [];
    
    for (const file of files) {
      try {
        // Generate unique filename
        const fileExtension = file.originalname.split('.').pop();
        const storedName = `${uuidv4()}.${fileExtension}`;
        const storagePath = `knowledge-base/${folder.access_level}/${storedName}`;
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('knowledge-base')
          .upload(storagePath, file.buffer, {
            contentType: file.mimetype,
            duplex: 'half'
          });
        
        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          continue;
        }
        
        // Save file record to database
        const { data: fileRecord, error: dbError } = await supabase
          .from('knowledge_files')
          .insert({
            original_name: file.originalname,
            stored_name: storedName,
            mime_type: file.mimetype,
            file_size: file.size,
            folder_id: folderId,
            owner_id: userId,
            access_level: folder.access_level,
            organization_id: folder.organization_id,
            storage_path: storagePath
          })
          .select()
          .single();
        
        if (dbError) {
          console.error('Database insert error:', dbError);
          // Clean up uploaded file
          await supabase.storage
            .from('knowledge-base')
            .remove([storagePath]);
          continue;
        }
        
        uploadedFiles.push(fileRecord);
      } catch (fileError) {
        console.error('Error processing file:', file.originalname, fileError);
      }
    }
    
    res.json({ 
      message: `${uploadedFiles.length} files uploaded successfully`,
      files: uploadedFiles 
    });
  } catch (error) {
    console.error('Error in POST /folders/:folderId/upload:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Download a file
router.get('/files/:fileId/download', requireAuth, async (req, res) => {
  try {
    const { fileId } = req.params;
    
    // Get file details
    const { data: file, error: fileError } = await supabase
      .from('knowledge_files')
      .select('*')
      .eq('id', fileId)
      .single();
    
    if (fileError || !file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Get signed URL from storage
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('knowledge-base')
      .createSignedUrl(file.storage_path, 60); // 1 minute expiry
    
    if (urlError) {
      console.error('Error creating signed URL:', urlError);
      return res.status(500).json({ error: 'Failed to generate download link' });
    }
    
    // Update download count
    await supabase
      .from('knowledge_files')
      .update({ download_count: file.download_count + 1 })
      .eq('id', fileId);
    
    res.json({ 
      downloadUrl: signedUrl.signedUrl,
      filename: file.original_name 
    });
  } catch (error) {
    console.error('Error in GET /files/:fileId/download:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a file
router.delete('/files/:fileId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { fileId } = req.params;
    
    // Get file details (only owner can delete)
    const { data: file, error: fileError } = await supabase
      .from('knowledge_files')
      .select('*')
      .eq('id', fileId)
      .eq('owner_id', userId)
      .single();
    
    if (fileError || !file) {
      return res.status(404).json({ error: 'File not found or access denied' });
    }
    
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('knowledge-base')
      .remove([file.storage_path]);
    
    if (storageError) {
      console.error('Error deleting from storage:', storageError);
    }
    
    // Delete from database
    const { error: dbError } = await supabase
      .from('knowledge_files')
      .delete()
      .eq('id', fileId)
      .eq('owner_id', userId);
    
    if (dbError) {
      console.error('Error deleting from database:', dbError);
      return res.status(500).json({ error: 'Failed to delete file' });
    }
    
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /files/:fileId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a folder
router.delete('/folders/:folderId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { folderId } = req.params;
    
    // Get folder details (only owner can delete, and not system folders)
    const { data: folder, error: folderError } = await supabase
      .from('knowledge_folders')
      .select('*')
      .eq('id', folderId)
      .eq('owner_id', userId)
      .eq('is_system_folder', false)
      .single();
    
    if (folderError || !folder) {
      return res.status(404).json({ error: 'Folder not found or cannot be deleted' });
    }
    
    // Get all files in this folder and its subfolders for cleanup
    const { data: filesToDelete } = await supabase
      .from('knowledge_files')
      .select('storage_path')
      .eq('folder_id', folderId);
    
    // Delete files from storage
    if (filesToDelete && filesToDelete.length > 0) {
      const storagePaths = filesToDelete.map(f => f.storage_path);
      await supabase.storage
        .from('knowledge-base')
        .remove(storagePaths);
    }
    
    // Delete folder (cascade will handle files and subfolders)
    const { error: dbError } = await supabase
      .from('knowledge_folders')
      .delete()
      .eq('id', folderId)
      .eq('owner_id', userId);
    
    if (dbError) {
      console.error('Error deleting folder:', dbError);
      return res.status(500).json({ error: 'Failed to delete folder' });
    }
    
    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /folders/:folderId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update file metadata
router.patch('/files/:fileId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { fileId } = req.params;
    const { original_name, tags } = req.body;
    
    const updates = {};
    if (original_name) updates.original_name = original_name;
    if (tags) updates.tags = tags;
    
    const { data: file, error } = await supabase
      .from('knowledge_files')
      .update(updates)
      .eq('id', fileId)
      .eq('owner_id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating file:', error);
      return res.status(500).json({ error: 'Failed to update file' });
    }
    
    if (!file) {
      return res.status(404).json({ error: 'File not found or access denied' });
    }
    
    res.json({ file });
  } catch (error) {
    console.error('Error in PATCH /files/:fileId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update folder
router.patch('/folders/:folderId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { folderId } = req.params;
    const { name, description } = req.body;
    
    const updates = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    
    const { data: folder, error } = await supabase
      .from('knowledge_folders')
      .update(updates)
      .eq('id', folderId)
      .eq('owner_id', userId)
      .eq('is_system_folder', false) // Can't rename system folders
      .select()
      .single();
    
    if (error) {
      console.error('Error updating folder:', error);
      return res.status(500).json({ error: 'Failed to update folder' });
    }
    
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found or cannot be modified' });
    }
    
    res.json({ folder });
  } catch (error) {
    console.error('Error in PATCH /folders/:folderId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;