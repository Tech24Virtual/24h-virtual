import { useParams, Navigate } from 'react-router-dom';
import BlogIndex from './BlogIndex';

export default function BlogCategory() {
  const { category } = useParams<{ category: string }>();
  if (!category) return <Navigate to="/blog" replace />;
  // BlogIndex handles category filtering via state; this route can redirect
  return <BlogIndex />;
}
