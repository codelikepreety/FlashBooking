import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios"
import { useAuth, useUser } from "@clerk/react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL 

export const AppContext = createContext()

export const AppProvider=({ children }) =>{

  const [isAdmin,setIsAdmin]=useState(false)
  const [isAdminLoading, setIsAdminLoading] = useState(true)
  const [shows,setShows] = useState({ movies: [] })
  const [favoriteMovies,setFavoriteMovies] = useState([])
  console.log(favoriteMovies)

  const image_base_url = import.meta.env.VITE_TMDB_IMAGE_BASE_URL;
  
  const {user} = useUser()
  const {getToken} = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const fetchIsAdmin = async ()=>{
    setIsAdminLoading(true)
    const token = await getToken()
    console.log(token)
    try{
      const {data} = await axios.get('/api/admin/is-admin',{headers: {Authorization:`Bearer ${token}`}})
      if (data.success && data.isAdmin) {
        setIsAdmin(true)
      } else {
        setIsAdmin(false)
        toast.error(data.message || "Not authorized as admin")
      }
    }catch (error){
      console.error(error)
      setIsAdmin(false)
      toast.error(error.message)
    }finally{
      setIsAdminLoading(false)
    }
  }

  // const fetchShows = async ()=>{
  //   try {
  //     const {data}= await axios.get('/api/show/all')
  //     if(data.success){
  //       setShows(data.shows)
  //     }else{
  //       toast.error(data.message)
  //     }
  //   }catch(error){
  //     console.error(error)
  //   }
  // }

  const fetchShows =async ()=>{
    try{
      const {data} = await axios.get('/api/show/now-playing',{headers:{Authorization:`Bearer ${await getToken()}`}})
      // console.log(data)
      if(data.success){
        setShows(data)
      }else{
        toast.error(data.message)
      }

    }catch (error){
      console.error(error)
    }
  }
  useEffect(()=>{
    fetchShows()
  },[])
  useEffect(()=>{
    if(user){
      fetchIsAdmin()
      // fetchFavoriteMovies()
    }
    
  },[user])


  const value ={
    axios,
  fetchIsAdmin,
  user,getToken,navigate,isAdmin,isAdminLoading,shows,
  favoriteMovies,image_base_url
  }
  return (
    <AppContext.Provider value={value}>
      { children}
    </AppContext.Provider>
  )
}

export const useAppContext=()=> useContext(AppContext)