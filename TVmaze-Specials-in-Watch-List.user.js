// ==UserScript==
// @name         TVmaze - Specials in Watch List
// @namespace    https://github.com/LenAnderson
// @downloadURL  https://github.com/LenAnderson/TVmaze-Specials-in-Watch-List
// @version      0.1
// @description  Show special episodes in watch list
// @author       LenAnderson
// @match        https://www.tvmaze.com/watchlist
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let getHtml = url => {
        return new Promise((resolve, reject) => {
            let req = new XMLHttpRequest();
            req.open('GET', url, true);
            req.addEventListener('load', () => {
                let html = document.createElement('div');
                html.innerHTML = req.responseText;
                resolve(html);
            });
            req.addEventListener('error', () => {
                reject();
            });
            req.send();
        });
    };

    let watchLists = [];

    let getSpecials = show => {
        return getHtml('/shows/' + show + '/x/episodes').then(html => {
            return {
                show: html.querySelector('.breadcrumbs > li:last-child > a').href.replace(/^.+shows\/(\d+)\/.+$/, '$1'),
                showTitle: html.querySelector('.breadcrumbs > li:last-child').previousElementSibling.textContent,
                episodes: Array.from(html.querySelectorAll('#Specials + .grid-view > .table > tbody > tr')).filter(it => it.querySelector('.watch-dropdown').value == '')
            };
        });
    };

    getHtml('/dashboard/follows').then(html => {
        return Promise.all(Array.from(html.querySelectorAll('#follow-list > #shows + ol > li > .name > a[href*="/shows/"]')).map(showLink => getSpecials(showLink.href.replace(/^.+\/shows\/(\d+)(\/.*|$)$/, '$1'))));
    }).then(specials => {
        console.log(specials);
        specials.forEach(specs => {
            let container = document.querySelector('.watchlist-show[data-show_id="' + specs.show + '"] > .watch-list');
            watchLists.push({
                show: container.closest('.watchlist-show').getAttribute('data-show_id'),
                container: container,
                specs: specs
            });
            if (container) {
                let tbody = container.querySelector('.table > tbody');
                specs.episodes.reverse().forEach(ep => {
                    let title = ep.querySelector('a[href^="/episodes/"]');
                    title.closest('td').remove();
                    ep.querySelector('.rate').closest('td').remove();
                    ep.children[0].appendChild(document.createTextNode(': '));
                    ep.children[0].appendChild(title);
                    tbody.appendChild(ep)
                });
            } else {
                console.warn('[TVmaze - Specials in Watchlist]', specs.showTitle + ': show not listed in watchlist --> need to add container...');
            }
        });

        console.log(watchLists);
    });

    let restoreSpecials = muts => {
        console.log('MUTS: ', muts);
        muts.forEach(mut => {
            Array.from(mut.removedNodes||[]).forEach(node => {
                let watchList = watchLists.find(it => it.container == node);
                if (watchList) {
                    getSpecials(watchList.show).then(specs => {
                        watchList.specs = specs;
                        watchList.container = document.querySelector('.watchlist-show[data-show_id="' + specs.show + '"] > .watch-list');
                        if (watchList.container) {
                            let tbody = watchList.container.querySelector('.table > tbody');
                            specs.episodes.reverse().forEach(ep => {
                                let title = ep.querySelector('a[href^="/episodes/"]');
                                title.closest('td').remove();
                                ep.querySelector('.rate').closest('td').remove();
                                ep.children[0].appendChild(document.createTextNode(': '));
                                ep.children[0].appendChild(title);
                                tbody.appendChild(ep)
                            });
                        } else {
                            console.warn('[TVmaze - Specials in Watchlist]', specs.showTitle + ': show not listed in watchlist --> need to add container...');
                        }
                    });
                }
            });
        });
    };

    let mo = new MutationObserver(restoreSpecials);
    mo.observe(document.body, {childList:true, subtree:true, attributes:true});

})();
