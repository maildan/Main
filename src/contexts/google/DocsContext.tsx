import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAuth } from './AuthContext';

// Google Docs 문서 타입 정의
interface GoogleDoc {
  id: string;
  title: string;
  createdTime: string;
  modifiedTime: string;
  content?: string;
  wordCount?: number;
  summary?: string;
}

// 문서 필터 타입 정의
interface DocFilter {
  searchTerm: string;
  sortBy: 'title' | 'modifiedTime' | 'createdTime' | 'wordCount';
  sortOrder: 'asc' | 'desc';
  dateRange?: {
    from: Date;
    to: Date;
  };
  minWordCount?: number;
  maxWordCount?: number;
}

// 문서 상태 타입 정의
interface DocsState {
  documents: GoogleDoc[];
  filteredDocuments: GoogleDoc[];
  selectedDocument: GoogleDoc | null;
  isLoading: boolean;
  error: string | null;
  filter: DocFilter;
}

// 문서 컨텍스트 액션 타입 정의
interface DocsContextType extends DocsState {
  fetchDocuments: () => Promise<void>;
  selectDocument: (docId: string) => Promise<void>;
  updateFilter: (filter: Partial<DocFilter>) => void;
  generateSummary: (docId: string) => Promise<void>;
  updateDocument: (docId: string, content: string) => Promise<void>;
  clearError: () => void;
  refreshDocument: (docId: string) => Promise<void>;
}

// 컨텍스트 생성
const DocsContext = createContext<DocsContextType | undefined>(undefined);

// 프로바이더 Props 타입
interface DocsProviderProps {
  children: ReactNode;
}

/**
 * Google Docs 문서를 관리하는 Context Provider
 * 문서 목록, 선택, 필터링, 요약, 수정 기능을 담당합니다.
 */
export function DocsProvider({ children }: DocsProviderProps) {
  const { isAuthenticated, user } = useAuth();
  
  const [docsState, setDocsState] = useState<DocsState>({
    documents: [],
    filteredDocuments: [],
    selectedDocument: null,
    isLoading: false,
    error: null,
    filter: {
      searchTerm: '',
      sortBy: 'modifiedTime',
      sortOrder: 'desc',
    },
  });

  /**
   * 인증 상태 변경 시 문서 목록 가져오기
   */
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchDocuments();
    } else {
      // 로그아웃 시 상태 초기화
      setDocsState(prev => ({
        ...prev,
        documents: [],
        filteredDocuments: [],
        selectedDocument: null,
      }));
    }
  }, [isAuthenticated, user]);

  /**
   * 필터 변경 시 문서 목록 필터링
   */
  useEffect(() => {
    applyFilter();
  }, [docsState.documents, docsState.filter]);

  /**
   * Google Docs 문서 목록 가져오기
   */
  const fetchDocuments = async () => {
    if (!isAuthenticated) return;

    try {
      setDocsState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // # debug: 문서 목록 조회 시작
      console.log('Fetching Google Docs list...');
      
      // Tauri 명령어로 Google Drive API 호출
      const docs = await invoke<GoogleDoc[]>('fetch_google_docs');
      
      // # debug: 문서 목록 조회 완료
      console.log(`Fetched ${docs.length} documents from Google Drive`);

      setDocsState(prev => ({
        ...prev,
        documents: docs,
        isLoading: false,
      }));
    } catch (error) {
      console.error('문서 목록 조회 오류:', error);
      setDocsState(prev => ({
        ...prev,
        documents: [],
        isLoading: false,
        error: typeof error === 'string' ? error : '문서 목록을 가져올 수 없습니다.',
      }));
    }
  };

  /**
   * 특정 문서 선택 및 내용 가져오기
   */
  const selectDocument = async (docId: string) => {
    try {
      setDocsState(prev => ({ ...prev, isLoading: true, error: null }));
      
      console.log(`Fetching content for document: ${docId}`);
      
      // Tauri 명령어로 실제 문서 내용 가져오기
      const docContent = await invoke<string>('fetch_document_content', { documentId: docId });
      
      console.log(`Document content fetched successfully, length: ${docContent.length}`);
      
      // 선택된 문서 정보 가져오기
      const selectedDoc = docsState.documents.find(doc => doc.id === docId);
      if (selectedDoc) {
        const docWithContent: GoogleDoc = {
          ...selectedDoc,
          content: docContent, // 실제 문서 내용 사용
        };

        setDocsState(prev => ({
          ...prev,
          selectedDocument: docWithContent,
          isLoading: false,
        }));
      } else {
        throw new Error('선택된 문서를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('문서 선택 오류:', error);
      setDocsState(prev => ({
        ...prev,
        isLoading: false,
        error: typeof error === 'string' ? error : '문서를 불러오는 중 오류가 발생했습니다.',
      }));
    }
  };

  /**
   * 필터 업데이트
   */
  const updateFilter = (newFilter: Partial<DocFilter>) => {
    setDocsState(prev => ({
      ...prev,
      filter: { ...prev.filter, ...newFilter },
    }));
  };

  /**
   * 필터 적용
   */
  const applyFilter = () => {
    let filtered = [...docsState.documents];
    const { searchTerm, sortBy, sortOrder, dateRange, minWordCount, maxWordCount } = docsState.filter;

    // 검색어 필터링
    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.content && doc.content.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // 날짜 범위 필터링
    if (dateRange) {
      filtered = filtered.filter(doc => {
        const modifiedDate = new Date(doc.modifiedTime);
        return modifiedDate >= dateRange.from && modifiedDate <= dateRange.to;
      });
    }

    // 단어 수 필터링
    if (minWordCount !== undefined) {
      filtered = filtered.filter(doc => (doc.wordCount || 0) >= minWordCount);
    }
    if (maxWordCount !== undefined) {
      filtered = filtered.filter(doc => (doc.wordCount || 0) <= maxWordCount);
    }

    // 정렬
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];

      if (sortBy === 'modifiedTime' || sortBy === 'createdTime') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setDocsState(prev => ({ ...prev, filteredDocuments: filtered }));
  };

  /**
   * 문서 요약 생성
   */
  const generateSummary = async (docId: string) => {
    try {
      setDocsState(prev => ({ ...prev, isLoading: true, error: null }));
      
      console.log(`Generating summary for document: ${docId}`);
      
      // Tauri 명령어로 실제 AI 요약 생성
      const summary = await invoke<string>('generate_summary', { documentId: docId });
      
      console.log('Summary generated successfully');
      
      // 문서 목록에서 해당 문서 업데이트
      setDocsState(prev => ({
        ...prev,
        documents: prev.documents.map(doc =>
          doc.id === docId ? { ...doc, summary } : doc
        ),
        selectedDocument: prev.selectedDocument?.id === docId 
          ? { ...prev.selectedDocument, summary }
          : prev.selectedDocument,
        isLoading: false,
      }));
    } catch (error) {
      console.error('요약 생성 오류:', error);
      setDocsState(prev => ({
        ...prev,
        isLoading: false,
        error: typeof error === 'string' ? error : '요약 생성 중 오류가 발생했습니다.',
      }));
    }
  };

  /**
   * 문서 내용 업데이트
   */
  const updateDocument = async (docId: string, content: string) => {
    try {
      setDocsState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // TODO: Tauri 명령어로 Google Docs API 호출 (batchUpdate)
      // await invoke('update_document', { docId, content });
      
      console.log(`문서 ${docId} 업데이트:`, content);
      
      setDocsState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      console.error('문서 업데이트 오류:', error);
      setDocsState(prev => ({
        ...prev,
        isLoading: false,
        error: '문서 업데이트 중 오류가 발생했습니다.',
      }));
    }
  };

  /**
   * 특정 문서 새로고침
   */
  const refreshDocument = async (docId: string) => {
    await selectDocument(docId);
  };

  /**
   * 에러 메시지 초기화
   */
  const clearError = () => {
    setDocsState(prev => ({ ...prev, error: null }));
  };

  const contextValue: DocsContextType = {
    ...docsState,
    fetchDocuments,
    selectDocument,
    updateFilter,
    generateSummary,
    updateDocument,
    clearError,
    refreshDocument,
  };

  return (
    <DocsContext.Provider value={contextValue}>
      {children}
    </DocsContext.Provider>
  );
}

/**
 * DocsContext를 사용하기 위한 커스텀 훅
 */
export function useDocs() {
  const context = useContext(DocsContext);
  if (context === undefined) {
    throw new Error('useDocs는 DocsProvider 내에서 사용되어야 합니다.');
  }
  return context;
}
