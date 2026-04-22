
const timeFormat=(minutes)=>{
    const hours = Math.floor(minutes / 60);
    const minutesReainder = minutes % 60;
    return `${hours}h ${minutesReainder}m`
}

export default timeFormat;