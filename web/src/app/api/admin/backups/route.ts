import { NextRequest, NextResponse } from 'next/server';
import BackupManager from '@/lib/admin/backup-manager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const backupId = searchParams.get('id');

    switch (action) {
      case 'list':
        // List all available backups
        const backups = await BackupManager.listBackups();
        return NextResponse.json({ 
          success: true, 
          backups: backups.map(backup => ({
            ...backup,
            size_kb: Math.round(backup.size / 1024),
            created_formatted: backup.created.toLocaleString()
          }))
        });

      case 'info':
        // Get detailed info about a specific backup
        if (!backupId) {
          return NextResponse.json(
            { success: false, error: 'Backup ID is required' },
            { status: 400 }
          );
        }
        
        const backupInfo = await BackupManager.getBackupInfo(backupId);
        if (!backupInfo) {
          return NextResponse.json(
            { success: false, error: 'Backup not found' },
            { status: 404 }
          );
        }
        
        return NextResponse.json({ 
          success: true, 
          backup: backupInfo 
        });

      case 'download':
        // Download a backup file
        if (!backupId) {
          return NextResponse.json(
            { success: false, error: 'Backup ID is required' },
            { status: 400 }
          );
        }
        
        const backupData = await BackupManager.getBackupInfo(backupId);
        if (!backupData) {
          return NextResponse.json(
            { success: false, error: 'Backup not found' },
            { status: 404 }
          );
        }
        
        // Return the backup data as downloadable JSON
        return new NextResponse(JSON.stringify(backupData, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${backupId}.json"`
          }
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error managing backups:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to manage backups' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const backupId = searchParams.get('id');

    if (!backupId) {
      return NextResponse.json(
        { success: false, error: 'Backup ID is required' },
        { status: 400 }
      );
    }

    const deleted = await BackupManager.deleteBackup(backupId);
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Backup not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: `Backup ${backupId} deleted successfully` 
    });
  } catch (error) {
    console.error('Error deleting backup:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete backup' 
      },
      { status: 500 }
    );
  }
}