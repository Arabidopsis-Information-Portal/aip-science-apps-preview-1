/*global cytoscape*/
(function(window, $, undefined) {
  'use strict';

  var DEBUG = true;

  var el, i, cytoscapeJsUrl, arborJsUrl, reCytoscape, reArbor, hasCytoscape, hasArbor, allScripts, log;

  log = function( message ) {
    if ( DEBUG ) {
      console.log( message );
    }
  };

  function init() {
    cytoscapeJsUrl = '/sites/all/libraries/bar-interaction-viewer/cytoscape.js/cytoscape.min.js';
    arborJsUrl = '/sites/all/libraries/bar-interaction-viewer/cytoscape.js/arbor.js';

    hasCytoscape = hasArbor = false;
    reCytoscape = new RegExp( cytoscapeJsUrl );
    reArbor = new RegExp( arborJsUrl );
    allScripts = document.querySelectorAll( 'script' );

    for ( i = 0; i < allScripts.length && !( hasCytoscape && hasArbor ); i++ ) {
      hasCytoscape = hasCytoscape || reCytoscape.test( allScripts[i].src );
      hasArbor = hasArbor || reCytoscape.test( allScripts[i].src );
    }

    if ( !hasCytoscape ) {
      log( 'adding Cytoscape.js' );

      el = document.createElement( 'script' );
      el.src = cytoscapeJsUrl;
      el.type = 'text/javascript';
      document.body.appendChild( el );
    }
    if (! hasArbor) {
      log( 'adding Arbor.js' );

      el = document.createElement( 'script' );
      el.src = arborJsUrl;
      el.type = 'text/javascript';
      document.body.appendChild( el );
    }
  }
  init();

  $( document ).ready(function() {
    var loadCy = function( elements ) {
      $( '#bar-interaction-viewer-cy' ).removeClass( 'hidden' ).cytoscape({
        layout: {
          name: 'arbor',
          liveUpdate: true,
          maxSimulationTime: 4000,
          padding: [ 50, 50, 50, 50 ],
          simulationBounds: undefined,
          ungrabifyWhileSimulating: true,
          repulsion: undefined,
          stiffness: undefined,
          friction: undefined,
          gravity: true,
          fps: undefined,
          precision: undefined,
          nodeMass: undefined,
          edgeLength: undefined,
          stepSize: 1,
          stableEnergy: function( energy ){
            var e = energy;
            return ( e.max <= 0.5 ) || ( e.mean <= 0.3 );
          }
        },
        style: cytoscape.stylesheet()
          .selector( 'node' )
          .css({
            'content': 'data( name )',
            'text-valign': 'center',
            'color': 'white',
            'text-outline-width': 2,
            'text-outline-color': '#888'
          })
          .selector( 'edge' )
          .css({
            'target-arrow-shape': 'triangle'
          })
          .selector( ':selected' )
          .css({
            'background-color': 'black',
            'line-color': 'black',
            'target-arrow-color': 'black',
            'source-arrow-color': 'black'
          })
          .selector( '.faded' )
          .css({
            'opacity': 0.25,
            'text-opacity': 0
          }),
        elements: elements,
        ready: function() {
          log( 'cytoscape ready' );

          var cy = this;
          // giddy up...
          cy.elements().unselectify();
          cy.on( 'tap', 'node', function( e ) {
            var node, neighborhood;
            node = e.cyTarget;
            neighborhood = node.neighborhood().add( node );
            cy.elements().addClass( 'faded' );
            neighborhood.removeClass( 'faded' );
          });

          cy.on( 'tap', function( e ){
            if( e.cyTarget === cy ){
              cy.elements().removeClass( 'faded' );
            }
          });
        },
      });
    }; //end loadCy()

    $( '#bar-interaction-viewer-form-reset' ).on('click', function() {
      log( 'reset form' );
      document.forms['bar-interaction-viewer-form'].gene.value = '';
      $( '#bar-interaction-viewer-cy' ).addClass( 'hidden' );
    });

    $( '#bar-interaction-viewer-form' ).on('submit', function( e ) {
      e.preventDefault();

      var nodes, proteins, edges, elements, gene, url, fail, success;
      nodes = [];
      proteins = [];
      edges = [];
      elements = {};
      gene = this.gene.value;
      url = 'https://api.araport.org/data/BioAnalyticResource/interactionBrowser/pr2-0.1/' + gene;

      fail = function() {
        $( '#bar-interaction-viewer-result' )
          .addClass( 'alert alert-danger' )
          .html( 'Gene data from ' + url + ' could not be loaded. Please try again.' );
      };

      success = function( data ) {
        log( data );

        var i, line, p1, p2;

        if ( data.length === 0 ) {
          fail();
        } else {
          data = data.split( /\n/ );

          for ( i = 0; i < data.length; i++ ) {
            line = data[ i ].split( /\t/ );
            if ( line[ 0 ].length > 0 ) {
              p1 = line[ 0 ].replace( /tair:/, '' );
              p2 = line[ 1 ].replace( /tair:/, '' );

              //add to "nodes" proteins array if not already in there
              if ( proteins.indexOf( p1 ) === -1 ) {
                proteins.push( p1 );
                nodes.push({
                  data: {
                    id: p1,
                    name: p1
                  }
                });
              } else {
                log( 'p1 not added' );
              }

              if ( proteins.indexOf( p2 ) === -1 ) {
                proteins.push( p2 );
                nodes.push({
                  data: {
                    id: p2,
                    name: p2
                  }
                });
              } else {
                log( 'p2 not added' );
              }

              //add the interaction
              edges.push({
                data:{
                  source: p1 ,
                  target: p2
                }
              });
            }
          }

          elements = { nodes: nodes, edges: edges };

          log( JSON.stringify( elements ) );

          loadCy( elements );
        }
      };

      if ( gene && gene.length > 0 ) {
        /* perform ajax GET */
        $.get( url, undefined, success, 'text' ).fail( fail );
      } else {
        window.alert( 'You must enter a gene first.' );
      }
    });
  });

})(window, jQuery);
