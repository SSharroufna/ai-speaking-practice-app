import React from 'react';

interface HeaderProps {
  currentPage: 'home' | 'history' | 'vocabulary';
  setPage: (page: 'home' | 'history' | 'vocabulary') => void;
}

const Header: React.FC<HeaderProps> = ({ currentPage, setPage }) => {
  const linkClasses = "px-3 py-2 rounded-md text-sm font-medium transition-colors";
  const activeLinkClasses = "bg-primary text-primary-foreground";
  const inactiveLinkClasses = "text-muted-foreground hover:bg-accent hover:text-accent-foreground";

  return (
    <header className="bg-card border-b border-border shadow-sm">
      <nav className="container mx-auto px-4 md:px-8 flex justify-between items-center h-16">
        <div className="flex items-center space-x-2">
           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary"><path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0"/><path d="M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0"/><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0"/></svg>
          <h1 className="text-xl font-bold text-foreground">Fluentify</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setPage('home')}
            className={`${linkClasses} ${currentPage === 'home' ? activeLinkClasses : inactiveLinkClasses}`}
          >
            Practice
          </button>
          <button
            onClick={() => setPage('history')}
            className={`${linkClasses} ${currentPage === 'history' ? activeLinkClasses : inactiveLinkClasses}`}
          >
            History
          </button>
          <button
            onClick={() => setPage('vocabulary')}
            className={`${linkClasses} ${currentPage === 'vocabulary' ? activeLinkClasses : inactiveLinkClasses}`}
          >
            Vocabulary
          </button>
        </div>
      </nav>
    </header>
  );
};

export default Header;