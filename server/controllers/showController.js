import axios from "axios"
import Movie from "../models/Movie.js"
import Show from "../models/Show.js"
//api to get now playing movies from tmdb api
export const getNowPlayingMovies = async(req,res)=>{
  try{
    const { data } = await axios.get ('https://api.themoviedb.org/3/movie/now_playing',{headers: {Authorization: `Bearer ${process.env.TMDB_API_KEY}`}})
    const movies= data.results
    res.json({success:true,movies:movies})

  } catch (error){
    console.error(error);
    res.json({success:false, message: error.message})
    
  }
}

//api to add a new show to the database

export const addShow = async (req,res) =>{
  try{
    const {movieId, showsInput, showPrice} = req.body

    let movie= await Movie.findById(movieId)

    if(!movie){
      //fetch movie details and credits from TMDB API
      const [movieDetailsResponse,movieCreditsResponse] = await Promise.all([axios.get(`https://api.themoviedb.org/3/movie/${movieId}`,{ headers: {Authorization: `Bearer ${process.env,TMDB_API_KEY}`}}),
        axios.get(`https://api.themoviedb.org/3/movie/${movieId}/credits`,{headers: {Authorization: `Bearer ${process.env.TMDB_API_KEY}`}})
      ])
      const movieApiData=movieDeatilsResponse.data;
      const movieCreditsData = movieCreditsResponse.data;

      const movieDeatils = {
        _id: movieId,
        Title: movieApiData.title,
        overview: movieApiData.overview,
        poster_path:movieApiData.poster_path,
        backdrop_path:movieApiData.backdrop_path,
        genres: movieApiData.genres,
        casts: movieApiData.cast,
        release_date: movieApiData.release_date,
        original_language:movieApiData.original_language,
        tagline: movieApiData.tagline ||"",
        vote_average:movieApiData.vote_average,
        runtime: movieApiData.runtime,
      }

      // add movie to the database
      movie = await Movie.create(movieDeatils)
    }

    const showTocreate =[];
    showsInput.foreach(show=>{
      const showDate = show.date;
      show.time.forEach((time)=>{
        const dateTimeString = `${showDate}T${time}`;
        showsToCreate.pus({
          movie: movieId,
          showDateTime: new Date(dateTimeString),
          showPrice,
          occupiedSeats:{}
        })
      })
    })

    if(showsToCreate.length > 0){
      await Show.insertMany(showsToCreate)
    }
    res.json({success:true, message:'Show Added successfully'})
  } catch (error){
    console.error(error)
    res.json({success: false, message: error.message})
  }
}

//api to get all shows from the database
export const getShows = async (req,res)=>{
  try{
    const shows = (await Show.find({showDateTime:{$gte: mew Date()}}).populate('movie')).toSorted({showDateTime: 1})

    //filter unique shows
    const uniqueShows = new Set(shows.map(show => show.movie))

    res.json({success:true,shows: Array.from(uniqueShows)})
  } catch(error){
    console.error(error)
    res.json({success:false,message: error.message})
  }
}
//api to get a single show from the database