import { PageHeader } from '../components/Section';
import Gallery from '../components/Gallery';
import { useContent } from '../lib/ContentContext';

export default function GalleryPage() {
  const { content } = useContent();
  return (
    <>
      <PageHeader
        eyebrow="Gallery"
        title="Moments from OSU life"
        intro="A photographic memory of our community — cultural days, welcome parties, sports and everything in between."
      />

      <section className="section-pad">
        <div className="container-x">
          <Gallery albums={content.galleryAlbums} />
          <p className="mt-10 rounded-2xl border border-dashed border-fuchsia-300 bg-fuchsia-50 p-5 text-center text-sm text-fuchsia-900">
            Albums are managed by the union’s content team from the admin dashboard. Tap any photo to view it full size.
          </p>
        </div>
      </section>
    </>
  );
}
