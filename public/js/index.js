
function hideDiv() {
    var x = document.getElementById("info-div");
    var button = document.getElementById("info");
    if (x.style.display === "none") {
      x.style.display = "block";
      button.innerHTML = '<i class="fa fa-arrow-up" aria-hidden="true"></i> Close';
    } else {
      x.style.display = "none";
      button.innerHTML = '<i class="fa fa-arrow-down" aria-hidden="true"></i> More Info';

    }
  }

  $(document).ready(function(){
    var clicked = true;
    $(".info").on('click', function(){
        if(clicked) {
            clicked=false;
            $("#info-div").css({"top": 0});
        }
        else {
            clicked=true;
            $("#info-div").css({"top": "-40px"});
        }
    });
  });


    const items = document.querySelectorAll(".accordion a");
    function toggleAccordion(){
    this.classList.toggle('active');
    this.nextElementSibling.classList.toggle('active');
    }
    
    items.forEach(item => item.addEventListener('click', toggleAccordion));

    
    function preventRefresh() {
      $("#noam").click(function( event ) {
        event.preventDefault();
      });
    }


    

    