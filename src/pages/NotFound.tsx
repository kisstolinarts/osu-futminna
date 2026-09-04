import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="flex min-h-[60vh] items-center justify-center px-4 py-20">
      <div className="text-center">
        <p className="text-7xl font-extrabold text-grad">404</p>
        <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Page not found</h1>
        <p className="mx-auto mt-2 max-w-md text-slate-500">
          The page you’re looking for doesn’t exist or may have moved.
        </p>
        <Link to="/" className="btn btn-lg btn-primary mt-8">
          Back to homepage
        </Link>
      </div>
    </section>
  );
}
