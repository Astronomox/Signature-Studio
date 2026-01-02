import React from 'react';
import SignatureMaker from './components/SignatureMaker';

const App: React.FC = () => {
  console.info('[APP-INIT-100] Application initialized successfully');
  
  return (
    <SignatureMaker />
  );
};

export default App;
