import React, { useEffect } from 'react'
import AdminNavbar from '../../components/admin/AdminNavbar'
import AdminSidebar from '../../components/admin/AdminSidebar'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import Loading from '../../components/Loading'

const Layout = () => {
 
  const {isAdmin, isAdminLoading, fetchIsAdmin} = useAppContext()
  const navigate = useNavigate()

  useEffect(()=>{
    fetchIsAdmin()
  },[])

  useEffect(() => {
    if (!isAdminLoading && !isAdmin) {
      navigate('/')
    }
  }, [isAdminLoading, isAdmin, navigate])

  if (isAdminLoading) {
    return <Loading />
  }

  return isAdmin ? (
    <>
     <AdminNavbar />
     <div className='flex'>
      <AdminSidebar />
      <div className='flex-1 px-4 py-10 md:px-10 h-[calc(100vh-64px)] overflow-y-auto'>
        <Outlet />

      </div>

     </div>
    </>
  ) : null
}

export default Layout