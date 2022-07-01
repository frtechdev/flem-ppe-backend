export const maskDate = (date) => {
    date = date.toString();
    if (date.includes("T")){
      date = date.split("-");
      const daySegment = date[2].substring(0,2);
      date = `${daySegment}/${date[1]}/${date[0]}`
    }
    else if (date.includes("/")){
      const segments = date.split("/");
      segments.forEach((segment) =>{
        if ((segment.toString()).length === 1){
          segments[segments.indexOf(segment)] = `0${segment}`
        }
      })
      date = segments.join("/");
    }
    else{
      date = null
    }
    return date
  };