import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle`

  ::-webkit-scrollbar {
    width: 0;
    background: transparent;
    display: none;
  }

  *, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html {
    scrollbar-width: none;
    -ms-overflow-style: none;
    overflow-y: hidden;
  }

  body {
    margin: 0;
    padding: 0;
    font-family: 'Wanted Sans Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background-color: #fff;
  }

  a {
    text-decoration: none;
  }

  h1, h2, h3, h4, h5, h6 {
    margin: 0;
    font-family: 'Wanted Sans Variable', sans-serif;
  }

  p {
    margin: 0;
    font-family: 'Wanted Sans Variable', sans-serif;
  }

  ul, ol {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  button, input, textarea {
    font-family: 'Wanted Sans Variable', sans-serif;
    border: none;
    outline: none;
  }

  button {
    cursor: pointer;
    background: none;
  }

  img {
    max-width: 100%;
    height: auto;
    display: block;
  }
`;

export default GlobalStyles;