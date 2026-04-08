
import React from 'react';

const DashboardPage = ()=>{
  const data:any[] = [];

  return (
    <div>
      {data.map((row:any)=>(
        <div key={row?.id || Math.random()}>
          {row?.weld_number || '-'} - {row?.project_id || '-'}
        </div>
      ))}
    </div>
  );
};

export default DashboardPage;
