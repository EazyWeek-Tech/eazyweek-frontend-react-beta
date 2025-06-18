/*Submenu click */
var eleli = document.querySelectorAll(".multi-li");
document.querySelectorAll(".multi-li").forEach((element) => {
  element.addEventListener("click", () => {
    element.classList.toggle("expnd");
  });
});
/*Submenu click */

/*Profile */

let profile = document.querySelector(".userdd");
let menu = document.querySelector(".usrmenu");

profile.onclick = function () {
  menu.classList.toggle("active");
};

document.querySelector(".c-icon").addEventListener("click", function () {
  document.querySelector(".lhs-nav").classList.toggle("expand");
  document.querySelectorAll(".multi-li").forEach((element) => {
    element.classList.remove("expnd");
  });
});

function removeexpn() {
  document.querySelectorAll(".multi-li").forEach((element) => {
    element.classList.remove("expnd");
  });
}
$(document).ready(function () {
  new DataTable("#example", {
    fixedColumns: true,
    paging: true,
    scrollCollapse: true,
    scrollX: true,
    scrollY: 600,
    bFilter: true,
    columnDefs: [{ width: "20%", targets: 0 }],
  });
});

$(function () {
  //defining all needed variables
  var $signIn = $("#sign-in");
  var $register = $("#register");
  var $formSignIn = $("div.sign-in");
  var $formRegister = $("div.register");

  $signIn.on("click", function () {
    $signIn.addClass("active");
    $register.removeClass("active");
    $formRegister.removeClass("active");
    $formSignIn.addClass("active");
  });

  $register.on("click", function () {
    if ($("#register").hasClass("disabled")) {
      $(".toastmsg").show().delay(3000).fadeOut();
    } else {
      $signIn.removeClass("active");
      $register.addClass("active");
      $formSignIn.removeClass("active");
      $formRegister.addClass("active");
    }
  });
});

function openTab(evt, tabName) {
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.className += " active";
}
