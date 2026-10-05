import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

// Helper to sanitize filename
function sanitizeFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase() || ".jpg";
  const baseName = path
    .basename(originalName, ext)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .slice(0, 40);

  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 7);
  return `yupek_${timestamp}_${baseName || "photo"}_${random}${ext}`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Support either single "file" or multiple "files" / "file"
    const files: File[] = [];
    const single = formData.get("file");
    if (single && typeof single === "object" && "arrayBuffer" in single) {
      files.push(single as File);
    }
    const multiple = formData.getAll("files");
    for (const f of multiple) {
      if (f && typeof f === "object" && "arrayBuffer" in f) {
        files.push(f as File);
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "No image file provided in upload" }, { status: 400 });
    }

    // Ensure upload dir exists
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const savedFiles: Array<{
      url: string;
      filename: string;
      originalName: string;
      size: number;
      type: string;
    }> = [];

    for (const file of files) {
      // Validate file is an image (allow common image extensions or MIME types)
      const isImage =
        file.type.startsWith("image/") ||
        /\.(jpe?g|png|webp|gif|svg|avif|heic|heif)$/i.test(file.name);

      if (!isImage) {
        continue;
      }

      // Max size: 50MB
      if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds maximum allowed size (50MB)` },
          { status: 400 }
        );
      }

      const cleanFilename = sanitizeFilename(file.name);
      const filePath = path.join(UPLOAD_DIR, cleanFilename);

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      await fs.writeFile(filePath, buffer);

      savedFiles.push({
        url: `/uploads/${cleanFilename}`,
        filename: cleanFilename,
        originalName: file.name,
        size: file.size,
        type: file.type || "image/jpeg",
      });
    }

    if (savedFiles.length === 0) {
      return NextResponse.json(
        { error: "No valid image files found to upload" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      url: savedFiles[0].url,
      file: savedFiles[0],
      files: savedFiles,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload processing failed";
    console.error("[Upload API Error]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const dirEntries = await fs.readdir(UPLOAD_DIR, { withFileTypes: true });

    const imageFiles = [];
    for (const entry of dirEntries) {
      if (entry.isFile() && /\.(jpe?g|png|webp|gif|svg|avif)$/i.test(entry.name)) {
        try {
          const stats = await fs.stat(path.join(UPLOAD_DIR, entry.name));
          imageFiles.push({
            url: `/uploads/${entry.name}`,
            filename: entry.name,
            size: stats.size,
            mtime: stats.mtime.toISOString(),
          });
        } catch {
          // ignore stat error
        }
      }
    }

    // Sort newest first
    imageFiles.sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime());

    return NextResponse.json({
      success: true,
      count: imageFiles.length,
      files: imageFiles,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to list media";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paramFilename = searchParams.get("filename");
    let filename = paramFilename;

    if (!filename) {
      const body = await request.json().catch(() => ({}));
      filename = body.filename;
    }

    if (!filename) {
      return NextResponse.json({ error: "Filename is required" }, { status: 400 });
    }

    // Strip any URL prefix if passed as "/uploads/..."
    const cleanName = path.basename(filename);
    const filePath = path.join(UPLOAD_DIR, cleanName);

    // Prevent directory traversal
    if (!filePath.startsWith(UPLOAD_DIR)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    await fs.unlink(filePath);
    return NextResponse.json({ success: true, deleted: cleanName });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
