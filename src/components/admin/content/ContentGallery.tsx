import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../../lib/api';
import { useContent } from '../../../lib/ContentContext';

interface Img { id: number; filename: string; caption: string }
interface Album { id: number; name: string; description: string; images: Img[] }

export default function ContentGallery() {
  const { refresh } = useContent();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [newAlbum, setNewAlbum] = useState('');
  const [uploadAlbum, setUploadAlbum] = useState<number | null>(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await api<{ albums: Album[] }>('/api/admin/content/albums');
    setAlbums(res.albums);
  }, []);
  useEffect(() => { load().catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e))); }, [load]);

  const createAlbum = async () => {
    if (!newAlbum.trim()) return;
    try {
      await api('/api/admin/content/albums', { method: 'POST', body: JSON.stringify({ name: newAlbum.trim() }) });
      setNewAlbum('');
      await load();
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Create failed.');
    }
  };

  const pickFiles = async (files: FileList | null) => {
    if (!files || !uploadAlbum || files.length === 0) return;
    setBusy(true);
    setErr('');
    try {
      const fd = new FormData();
      if (caption.trim()) fd.append('caption', caption.trim());
      Array.from(files).forEach((f) => fd.append('images', f));
      await api(`/api/admin/content/albums/${uploadAlbum}/images`, { method: 'POST', body: fd });
      setCaption('');
      if (fileRef.current) fileRef.current.value = '';
      setUploadAlbum(null);
      await load();
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  const deleteImage = async (img: Img) => {
    if (!confirm('Delete this image?')) return;
    await api(`/api/admin/content/images/${img.id}`, { method: 'DELETE' });
    await load();
    await refresh();
  };
  const deleteAlbum = async (a: Album) => {
    if (!confirm(`Delete album "${a.name}" and all its images?`)) return;
    await api(`/api/admin/content/albums/${a.id}`, { method: 'DELETE' });
    await load();
    await refresh();
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h3 className="font-bold text-slate-900">Albums</h3>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input className="input sm:max-w-xs" placeholder="New album name (e.g. OSU Week 2026)" value={newAlbum} onChange={(e) => setNewAlbum(e.target.value)} />
          <button className="btn btn-md btn-primary" onClick={createAlbum}>+ Create album</button>
        </div>
        {err && <p className="mt-3 text-sm text-rose-700">{err}</p>}
        <p className="mt-3 text-xs text-slate-400">Uploads are stored securely and will move to cloud storage at launch. Supported: JPG, PNG, WEBP, GIF (max 8 MB each).</p>
      </div>

      {albums.map((a) => (
        <div key={a.id} className="card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <h4 className="font-bold text-slate-900">{a.name} <span className="text-xs font-normal text-slate-400">({a.images.length} photo{a.images.length === 1 ? '' : 's'})</span></h4>
            <div className="flex items-center gap-2">
              <button className="btn btn-md btn-outline" onClick={() => setUploadAlbum(uploadAlbum === a.id ? null : a.id)}>
                {uploadAlbum === a.id ? 'Close upload' : '+ Add photos'}
              </button>
              <button className="btn btn-md btn-outline !text-rose-600" onClick={() => deleteAlbum(a)}>Delete album</button>
            </div>
          </div>

          {uploadAlbum === a.id && (
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input className="input sm:max-w-xs" placeholder="Caption (optional, applies to all)" value={caption} onChange={(e) => setCaption(e.target.value)} />
                <label className="btn btn-md btn-primary cursor-pointer">
                  {busy ? 'Uploading…' : 'Choose photos'}
                  <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" disabled={busy} onChange={(e) => pickFiles(e.target.files)} />
                </label>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 lg:grid-cols-4">
            {a.images.map((img) => (
              <figure key={img.id} className="group relative">
                <img src={img.filename} alt={img.caption} className="aspect-[4/3] w-full rounded-xl object-cover" />
                <figcaption className="mt-1 line-clamp-1 text-xs text-slate-500">{img.caption || '\u00A0'}</figcaption>
                <button
                  className="absolute right-1.5 top-1.5 hidden h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white group-hover:flex"
                  onClick={() => deleteImage(img)}
                  aria-label="Delete image"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              </figure>
            ))}
            {a.images.length === 0 && <p className="col-span-full py-6 text-center text-sm text-slate-400">No photos yet.</p>}
          </div>
        </div>
      ))}
      {albums.length === 0 && <p className="text-center text-sm text-slate-400">No albums yet — create one to start adding photos.</p>}
    </div>
  );
}
