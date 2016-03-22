// http://stackoverflow.com/a/22050874/5599794
(function (jQuery)
{
    jQuery.whenAll = function (deferreds)
    {
        var lastResolved = 0;
        var wrappedDeferreds = [];

        for (var i = 0; i < deferreds.length; i++) {
            wrappedDeferreds.push(jQuery.Deferred());

            deferreds[i].always(function(jqXHR) {
                wrappedDeferreds[lastResolved++].resolve(arguments);
            });
        }

        return jQuery.when.apply(jQuery, wrappedDeferreds).promise();
    };
}(jQuery));
