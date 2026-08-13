import { LoadingSpinner } from '@/app/components/LoadingSpinner';

export default function KnowledgeBaseLoading() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ backgroundColor: '#F8FAFC' }}
    >
      <LoadingSpinner
        label="Loading knowledge base…"
        size="lg"
        className="flex-col text-[#005657]"
      />
    </div>
  );
}
